import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const LANGUAGE_NAME_TO_CODE: Record<string, string> = {
  english: 'en',
  bengali: 'bn',
  bangla: 'bn',
  arabic: 'ar',
  urdu: 'ur',
  turkish: 'tr',
  french: 'fr',
  german: 'de',
  spanish: 'es',
  hindi: 'hi',
  indonesian: 'id',
  italian: 'it',
  portuguese: 'pt',
  russian: 'ru',
  chinese: 'zh',
};

function normalizeECode(raw: string): string {
  return raw.toUpperCase().replace(/^EN:/, '').replace(/[^A-Z0-9]/g, '');
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let modelName = 'llama-3.3-70b-versatile';
  let barcode = '';
  let deviceId = '';

  try {
    const body = await req.json();
    const {
      productName = '',
      brand = '',
      imageUrl = '',
      ingredientsText = '',
      parsedIngredients = [],
      additives = [],
      imageBase64,
      language = 'English',
    } = body;

    barcode = (body.barcode || '').trim();
    deviceId = body.deviceId || '';
    const langCode =
      LANGUAGE_NAME_TO_CODE[String(language).toLowerCase().trim()] ||
      String(language).toLowerCase().slice(0, 2) ||
      'en';

    // 1. Fetch live Groq configuration & Admin Additives dictionary in parallel
    const [{ data: settings }, { data: dbAdditives }] = await Promise.all([
      supabase.from('groq_settings').select('*').eq('id', 'global').maybeSingle(),
      supabase.from('additives').select('*'),
    ]);

    if (settings && settings.is_enabled === false) {
      return NextResponse.json(
        { success: false, error: 'AI analysis is currently disabled by administrator' },
        { status: 503 }
      );
    }

    const apiKey = (settings?.api_key || process.env.GROQ_API_KEY || '').trim();
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Groq API Key is not configured on the server' },
        { status: 500 }
      );
    }

    // Build lookup map of Admin Additives by normalized E-code (e.g. "E120", "E471")
    const additiveMap = new Map<string, any>();
    for (const row of dbAdditives || []) {
      if (row.code) {
        additiveMap.set(normalizeECode(row.code), row);
      }
    }

    // Detect all E-numbers from `additives` array and `ingredientsText`
    const detectedECodes = new Set<string>();
    for (const a of additives || []) {
      const norm = normalizeECode(String(a));
      if (/^E\d{3,4}[A-Z]?$/.test(norm)) {
        detectedECodes.add(norm);
      }
    }
    const regexMatches = String(ingredientsText).match(/\bE-?\d{3,4}[a-zA-Z]?\b/gi) || [];
    for (const m of regexMatches) {
      detectedECodes.add(normalizeECode(m));
    }

    // Match detected E-codes against Admin Additives table
    const matchedAdminAdditives: Array<{
      code: string;
      name: string;
      status: 'halal' | 'haram' | 'doubtful';
      reason: string;
    }> = [];

    for (const code of detectedECodes) {
      const dbRow = additiveMap.get(code);
      if (dbRow) {
        const rawStatus = String(dbRow.status || 'MUSHBOOH').toUpperCase();
        const mappedStatus: 'halal' | 'haram' | 'doubtful' =
          rawStatus === 'HALAL' ? 'halal' : rawStatus === 'HARAM' ? 'haram' : 'doubtful';
        const trans =
          dbRow.translations?.[langCode] ||
          dbRow.translations?.['en'] ||
          {};
        const displayName = trans.name
          ? `${dbRow.code} (${trans.name})`
          : `${dbRow.code} (${dbRow.name_en})`;
        const reason =
          trans.halalReason ||
          trans.description ||
          `Source: ${dbRow.source || 'Verified'} (${dbRow.category || 'Additive'})`;

        matchedAdminAdditives.push({
          code: dbRow.code,
          name: displayName,
          status: mappedStatus,
          reason,
        });
      }
    }

    const adminAdditivePromptBlock =
      matchedAdminAdditives.length > 0
        ? `\nOfficial Admin Additive Dictionary Rulings (MANDATORY - YOU MUST USE THESE EXACT STATUSES AND REASONS FOR THESE E-NUMBERS):\n` +
          matchedAdminAdditives
            .map((a) => `- ${a.name}: status="${a.status}", reason="${a.reason}"`)
            .join('\n') +
          '\n'
        : '';

    modelName = imageBase64
      ? settings?.vision_model || 'llama-3.2-11b-vision-preview'
      : settings?.model || 'llama-3.3-70b-versatile';

    let prompt = `Analyze the provided product and its ingredients for Halal compliance based on universally accepted Islamic Dietary Laws (Shari'ah). YOU MUST PROVIDE ALL REASONS AND SUMMARIES IN ${language}.

*** CRITICAL VALIDATION RULE (MUST CHECK FIRST) ***
Before analyzing, you MUST first determine if the provided text actually contains real food/beverage ingredients.
If the input is ANY of the following, you MUST return the "not_food" response shown below:
- Random words, greetings, or single non-ingredient words (e.g. "hi", "hello", "test")
- Profanity, slang, or offensive language
- General sentences, messages, or conversations that are not ingredient lists
- Gibberish, nonsensical text, or text that does not resemble a food ingredient list
- Very short text (1-2 words) that is clearly not a food ingredient name

"not_food" Response (use when input is NOT a valid ingredient list):
{
  "overall_status": "not_food",
  "overall_reason": "The provided text does not contain recognizable food ingredients.",
  "ingredients": []
}

Only proceed with halal analysis if the text genuinely contains food ingredient names.
*** END VALIDATION RULE ***

Product: "${productName}"
Ingredients: "${ingredientsText}"
${parsedIngredients.length > 0 ? `Parsed Items: ${JSON.stringify(parsedIngredients)}` : ''}
${
  detectedECodes.size > 0
    ? `Detected Additives/E-numbers: ${Array.from(detectedECodes).join(', ')}`
    : ''
}
${adminAdditivePromptBlock}
Internal Logic for Classification:
1. "haram": 
   - ANY derivative of swine (pork, bacon, lard, pig-skin).
   - Intoxicants (Alcohol added as an ingredient, wine, beer).
   - Insects (except locusts); specifically flag E120 (Carmine) and E904 (Shellac).
   - Animal-derived ingredients without a declared Halal source (e.g. Pepsin from pork, Bone Phosphate E542).
2. "doubtful" (Mushbooh): 
   - Animal enzymes, emulsifiers (E471, E472), or stabilizers (Glycerin E422) where the source (plant vs animal) is not specified.
   - Whey or Cheese where the source of rennet/enzymes is unknown.
   - L-cysteine (E920) if the origin is not confirmed as plant-based.
3. "halal": 
   - Purely plant-based items, minerals, synthetic chemicals.
   - Dairy (from Halal animals), Fish, and Eggs.
   - Specifically confirm "Plant-based Lecithin" or "Soy Lecithin" as Halal.

Output JSON Structure (MANDATORY):
{
  "overall_status": "halal|haram|doubtful|not_food",
  "overall_reason": "Detailed summary of the entire product's status (IN ${language}).",
  "ingredients": [
    {
      "name": "Original Name",
      "status": "halal|haram|doubtful",
      "reason": "Expert technical/religious reason for this classification (IN ${language})."
    }
  ]
}`;

    if (imageBase64) {
      prompt =
        `Analyze the provided image containing an ingredient label. Rigorously EXTRACT EVERY SINGLE INGREDIENT visible in the image (in ANY language) with the highest possible accuracy. Evaluate all extracted ingredients for Halal compliance based on universally accepted Islamic Dietary Laws (Shari'ah). YOU MUST PROVIDE ALL REASONS AND SUMMARIES IN ${language}. Keep the original native name in the name field alongside the English translation if applicable.\n\n` +
        prompt;
    }

    const messages: any[] = [
      {
        role: 'system',
        content:
          'You are a Senior Halal Certification Auditor and Islamic Food Technologist. You specialize in identifying hidden animal derivatives, cross-contamination risks, and checking E-numbers against the latest Global Halal Standards. You MUST reply with ONLY valid JSON.',
      },
    ];

    if (imageBase64) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
          },
        ],
      });
    } else {
      messages.push({ role: 'user', content: prompt });
    }

    // 2. Call Groq API
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        temperature: settings?.temperature ?? 0.1,
        max_completion_tokens: settings?.max_tokens ?? 2048,
        response_format: { type: 'json_object' },
      }),
    });

    const latencyMs = Date.now() - startTime;
    const responseData = await groqResponse.json();

    if (!groqResponse.ok) {
      const errorMsg =
        responseData.error?.message || `Groq API responded with code ${groqResponse.status}`;

      await supabase.from('groq_api_logs').insert({
        endpoint: '/openai/v1/chat/completions',
        model: modelName,
        barcode: barcode || null,
        user_device_id: deviceId || null,
        prompt_tokens: 0,
        completion_tokens: 0,
        latency_ms: latencyMs,
        status_code: groqResponse.status,
        status: groqResponse.status === 429 ? 'RATE_LIMITED' : 'ERROR',
        error_message: errorMsg,
      });

      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: groqResponse.status }
      );
    }

    // 3. Extract tokens & result
    const usage = responseData.usage || {};
    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;

    const rawContent = responseData.choices?.[0]?.message?.content;
    let rawParsed: any;
    try {
      rawParsed = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
    } catch (_) {
      rawParsed = {
        overall_status: 'doubtful',
        overall_reason: rawContent || 'Could not parse JSON response from Groq',
        ingredients: [],
      };
    }

    // Normalize result structure
    const statusStr = (rawParsed.overall_status || rawParsed.status || 'doubtful')
      .toLowerCase()
      .trim();
    let overallStatus = 'doubtful';
    if (statusStr === 'not_food') {
      overallStatus = 'not_food';
    } else if (statusStr.includes('halal')) {
      overallStatus = 'halal';
    } else if (statusStr.includes('haram')) {
      overallStatus = 'haram';
    }

    const rawIngredients = rawParsed.ingredients || rawParsed.ingredientResults || [];
    const ingredientResults: Array<{
      ingredient: string;
      name: string;
      status: string;
      reason: string;
    }> = rawIngredients.map((item: any) => {
      const name = item.name || item.ingredient || 'Ingredient';
      const itemStatusRaw = (item.status || 'doubtful').toLowerCase().trim();
      let itemStatus = 'doubtful';
      if (itemStatusRaw.includes('halal')) itemStatus = 'halal';
      else if (itemStatusRaw.includes('haram')) itemStatus = 'haram';

      return {
        ingredient: name,
        name,
        status: itemStatus,
        reason: item.reason || 'Standard assessment',
      };
    });

    // Enforce Admin Additives Dictionary rulings on ingredientResults
    if (overallStatus !== 'not_food' && matchedAdminAdditives.length > 0) {
      for (const adminAdd of matchedAdminAdditives) {
        const codeUpper = adminAdd.code.toUpperCase();
        const existingIdx = ingredientResults.findIndex((ir) =>
          ir.ingredient.toUpperCase().includes(codeUpper)
        );
        if (existingIdx >= 0) {
          ingredientResults[existingIdx].status = adminAdd.status;
          ingredientResults[existingIdx].reason = adminAdd.reason;
        } else {
          ingredientResults.push({
            ingredient: adminAdd.name,
            name: adminAdd.name,
            status: adminAdd.status,
            reason: adminAdd.reason,
          });
        }
      }

      // Recalculate overallStatus based on enforced ingredient statuses
      if (ingredientResults.some((i) => i.status === 'haram')) {
        overallStatus = 'haram';
      } else if (ingredientResults.some((i) => i.status === 'doubtful')) {
        overallStatus = 'doubtful';
      } else if (ingredientResults.length > 0) {
        overallStatus = 'halal';
      }
    }

    // Check if this product has an Admin status in Supabase `products` table (by barcode or productName)
    let existingDbProduct: any = null;
    if (overallStatus !== 'not_food') {
      if (barcode) {
        const { data } = await supabase
          .from('products')
          .select('*')
          .eq('barcode', barcode)
          .maybeSingle();
        existingDbProduct = data;
      } else if (productName && productName !== 'Scanned Ingredients' && productName !== 'Scanned Image') {
        const { data } = await supabase
          .from('products')
          .select('*')
          .ilike('name', productName.trim())
          .maybeSingle();
        existingDbProduct = data;
      }

      if (existingDbProduct) {
        const adminStatusRaw = String(
          existingDbProduct.manual_status || existingDbProduct.ai_status || ''
        ).toUpperCase();
        const note =
          existingDbProduct.moderator_note || 'Verified by Allo Halal Admin';

        if (adminStatusRaw === 'HALAL') {
          overallStatus = 'halal';
          for (const ir of ingredientResults) {
            if (ir.status !== 'halal') {
              ir.status = 'halal';
              ir.reason = note;
            }
          }
        } else if (adminStatusRaw === 'HARAM') {
          overallStatus = 'haram';
          if (!ingredientResults.some((i) => i.status === 'haram')) {
            const doubtfulItem = ingredientResults.find((i) => i.status === 'doubtful');
            if (doubtfulItem) {
              doubtfulItem.status = 'haram';
              doubtfulItem.reason = note;
            } else {
              ingredientResults.unshift({
                ingredient: existingDbProduct.name || productName || 'Product',
                name: existingDbProduct.name || productName || 'Product',
                status: 'haram',
                reason: note,
              });
            }
          }
        } else if (adminStatusRaw === 'MUSHBOOH' || adminStatusRaw === 'DOUBTFUL') {
          overallStatus = 'doubtful';
          for (const ir of ingredientResults) {
            if (ir.status === 'haram') {
              ir.status = 'doubtful';
              ir.reason = note;
            }
          }
          if (!ingredientResults.some((i) => i.status === 'doubtful')) {
            ingredientResults.unshift({
              ingredient: existingDbProduct.name || productName || 'Product',
              name: existingDbProduct.name || productName || 'Product',
              status: 'doubtful',
              reason: note,
            });
          }
        }
      }
    }

    const haramIngredients = ingredientResults
      .filter((i) => i.status === 'haram')
      .map((i) => i.ingredient);
    const doubtfulIngredients = ingredientResults
      .filter((i) => i.status === 'doubtful')
      .map((i) => i.ingredient);
    const halalIngredients = ingredientResults
      .filter((i) => i.status === 'halal')
      .map((i) => i.ingredient);

    const finalResult = {
      overallStatus: overallStatus === 'not_food' ? 'doubtful' : overallStatus,
      overall_status: overallStatus,
      overall_reason: rawParsed.overall_reason || rawParsed.reasoning || '',
      reasoning: rawParsed.overall_reason || rawParsed.reasoning || '',
      is_not_food: overallStatus === 'not_food',
      ingredientResults,
      ingredients: ingredientResults,
      haramIngredients,
      doubtfulIngredients,
      halalIngredients,
    };

    // 4. Auto-save scanned barcode product to Supabase `products` table (if not already present)
    if (barcode && overallStatus !== 'not_food') {
      try {
        const { data: existingProd } = await supabase
          .from('products')
          .select('id, scans_count')
          .eq('barcode', barcode)
          .maybeSingle();

        const dbAiStatus =
          overallStatus === 'halal'
            ? 'HALAL'
            : overallStatus === 'haram'
              ? 'HARAM'
              : 'MUSHBOOH';

        if (!existingProd) {
          await supabase.from('products').insert({
            barcode,
            name: productName || 'Scanned Product',
            brand: brand || '',
            image_url: imageUrl || null,
            ingredients_raw: ingredientsText || '',
            detected_additives: Array.from(detectedECodes),
            ai_status: dbAiStatus,
            is_overridden: false,
            scans_count: 1,
            updated_at: new Date().toISOString(),
          });
        }
      } catch (_) {}
    }

    // 5. Log successful telemetry to Supabase
    await supabase.from('groq_api_logs').insert({
      endpoint: '/openai/v1/chat/completions',
      model: modelName,
      barcode: barcode || null,
      user_device_id: deviceId || null,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      latency_ms: latencyMs,
      status_code: 200,
      status: 'SUCCESS',
      error_message: null,
    });

    return NextResponse.json({
      success: true,
      result: finalResult,
      telemetry: {
        latencyMs,
        model: modelName,
        promptTokens,
        completionTokens,
      },
    });
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;

    try {
      await supabase.from('groq_api_logs').insert({
        endpoint: '/openai/v1/chat/completions',
        model: modelName,
        barcode: barcode || null,
        user_device_id: deviceId || null,
        prompt_tokens: 0,
        completion_tokens: 0,
        latency_ms: latencyMs,
        status_code: 500,
        status: 'ERROR',
        error_message: error.message || 'Internal server error during analysis',
      });
    } catch (_) {}

    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
