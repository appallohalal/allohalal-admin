import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let modelName = 'llama-3.3-70b-versatile';
  let barcode = '';
  let deviceId = '';

  try {
    const body = await req.json();
    const {
      productName = '',
      ingredientsText = '',
      parsedIngredients = [],
      additives = [],
      imageBase64,
      language = 'English',
    } = body;

    barcode = body.barcode || '';
    deviceId = body.deviceId || '';

    // 1. Fetch live Groq configuration from Supabase
    const { data: settings } = await supabase
      .from('groq_settings')
      .select('*')
      .eq('id', 'global')
      .maybeSingle();

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

    modelName = imageBase64
      ? (settings?.vision_model || 'llama-3.2-11b-vision-preview')
      : (settings?.model || 'llama-3.3-70b-versatile');

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
${additives.length > 0 ? `Detected Additives/E-numbers: ${additives.join(', ')}` : ''}

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
      prompt = `Analyze the provided image containing an ingredient label. Rigorously EXTRACT EVERY SINGLE INGREDIENT visible in the image (in ANY language) with the highest possible accuracy. Evaluate all extracted ingredients for Halal compliance based on universally accepted Islamic Dietary Laws (Shari'ah). YOU MUST PROVIDE ALL REASONS AND SUMMARIES IN ${language}. Keep the original native name in the name field alongside the English translation if applicable.\n\n` + prompt;
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

      // Log failure telemetry
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
    const statusStr = (rawParsed.overall_status || rawParsed.status || 'doubtful').toLowerCase().trim();
    let overallStatus = 'doubtful';
    if (statusStr === 'not_food') {
      overallStatus = 'not_food';
    } else if (statusStr.includes('halal')) {
      overallStatus = 'halal';
    } else if (statusStr.includes('haram')) {
      overallStatus = 'haram';
    }

    const rawIngredients = rawParsed.ingredients || rawParsed.ingredientResults || [];
    const ingredientResults = rawIngredients.map((item: any) => {
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

    const haramIngredients = ingredientResults
      .filter((i: any) => i.status === 'haram')
      .map((i: any) => i.ingredient);
    const doubtfulIngredients = ingredientResults
      .filter((i: any) => i.status === 'doubtful')
      .map((i: any) => i.ingredient);
    const halalIngredients = ingredientResults
      .filter((i: any) => i.status === 'halal')
      .map((i: any) => i.ingredient);

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

    // 4. Log successful telemetry to Supabase
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

    // Log unexpected failure
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
