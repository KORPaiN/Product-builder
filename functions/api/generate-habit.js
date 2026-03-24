// functions/api/generate-habit.js
// Cloudflare Pages Function - Gemini API 프록시
// API 키는 Cloudflare 대시보드 > Settings > Environment Variables 에 GEMINI_API_KEY 로 설정

export async function onRequestPost(context) {
    // CORS 헤더
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    };

    try {
        const { goal } = await context.request.json();

        if (!goal || typeof goal !== 'string' || goal.trim().length === 0) {
            return new Response(JSON.stringify({ error: '목표를 입력해주세요.' }), {
                status: 400,
                headers: corsHeaders,
            });
        }

        const apiKey = context.env.GEMINI_API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ error: '서버에 API 키가 설정되지 않았습니다.' }), {
                status: 500,
                headers: corsHeaders,
            });
        }

        const prompt = `
자주 하는 기존 루틴 뒤에 아주 작은 행동을 붙이는 방식으로 다음 목표에 대한 습관을 디자인하고 JSON으로 응답하세요.
목표: "${goal.trim()}"

응답 JSON 구조:
{
    "language": "ko",
    "category": "string",
    "selectedAnchor": "string (구체적인 기존 루틴)",
    "mva": { "title": "string (앵커 직후의 30초 내외의 아주 작은 행동)" },
    "levels": [
        { "title": "난이도 0의 아주 쉬운 행동", "difficulty": 0 },
        { "title": "난이도 1의 행동 (MVA)", "difficulty": 1 },
        { "title": "난이도 2", "difficulty": 2 },
        { "title": "난이도 3", "difficulty": 3 },
        { "title": "난이도 4", "difficulty": 4 },
        { "title": "난이도 5", "difficulty": 5 },
        { "title": "난이도 6의 최종 목표 행동", "difficulty": 6 }
    ],
    "celebrations": ["string (즉시 할 수 있는 축하 표현 3개 이상)"]
}
JSON만 응답하고 다른 텍스트는 포함하지 마세요.
        `;

        const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-pro'];
        let geminiRes = null;
        let lastErrText = '';

        for (const model of modelsToTry) {
            geminiRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { responseMimeType: 'application/json' },
                    }),
                }
            );

            if (geminiRes.ok) {
                break; // 성공 시 루프 탈출
            }

            lastErrText = await geminiRes.text();
            
            // 모델을 찾을 수 없는 404 에러일 때만 다음 모델로 재시도, 권한 등 다른 에러면 루프 중단
            if (geminiRes.status !== 404) {
                break;
            }
        }

        if (!geminiRes || !geminiRes.ok) {
            console.error('Gemini API error:', lastErrText);
            
            let errorDetail = 'AI 요청에 실패했습니다.';
            try { 
                 const errObj = JSON.parse(lastErrText);
                 if (errObj.error && errObj.error.message) errorDetail = errObj.error.message;
            } catch(e) { 
                 errorDetail = lastErrText;
            }

            return new Response(JSON.stringify({ error: `[Gemini 에러] ${errorDetail}` }), {
                status: 502,
                headers: corsHeaders,
            });
        }

        const geminiData = await geminiRes.json();
        let resultText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!resultText) {
            return new Response(JSON.stringify({ error: 'AI 응답을 파싱할 수 없습니다.' }), {
                status: 502,
                headers: corsHeaders,
            });
        }

        // JSON 유효성 검증을 위해 앞뒤의 ```json 등의 마크다운 블록 제거
        resultText = resultText.replace(/^```json\\s*/i, '').replace(/```$/i, '').trim();
        JSON.parse(resultText);

        return new Response(resultText, { status: 200, headers: corsHeaders });

    } catch (err) {
        console.error('Function error:', err);
        return new Response(JSON.stringify({ error: '서버 오류가 발생했습니다.' }), {
            status: 500,
            headers: corsHeaders,
        });
    }
}

// CORS preflight 처리
export async function onRequestOptions() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
