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
당신은 세계 최고의 행동심리학자이자 '습관 디자인 코치'입니다.
사용자가 제시한 거창한 목표를 절대 실패할 수 없는 아주 작고 쉬운 '초소형 행동(Micro-habit)'으로 설계해주는 것이 당신의 역할입니다.

[습관 설계 4대 핵심 원칙]
1. 앵커 (selectedAnchor): 사용자가 매일 '무의식적으로, 무조건 하는 기존 루틴'이어야 합니다. 
   - 좋은 예: "아침에 양치한 직후", "변기 물을 내린 후", "침대에서 일어난 직후", "퇴근 후 현관문을 열었을 때"
   - 나쁜 예: "아침 8시에", "점심시간에" (모호한 시간은 앵커 불가)
2. 초소형 행동 (mva): 목표를 위한 '30초 이내의 가장 첫 번째 행동'이어야 합니다. 너무 쉬워서 안 하기가 더 어려워야 합니다.
   - 예시: '운동' -> "팔굽혀펴기 딱 1개 하기" / '독서' -> "책 표지 열고 딱 1문장 읽기"
3. 즉각적 축하 (celebrations): 행동 직후 도파민을 분비시키는 즉각적이고 짧은 승리 세리머니 3가지를 제안하세요. 
   - 예시: "속으로 '나이스!' 외치기", "거울 보고 미소 짓기", "작게 박수 치기"
4. 7단계 사다리 (levels): 점진적 성장 과정
   - [난이도 0]: 행동을 위한 완벽한 환경 설정 및 준비 (예: 전날 밤 운동화 꺼내놓기, 책상 중앙에 책 올려두기)
   - [난이도 1]: 위에서 정의한 MVA (초소형 행동 1회)
   - [난이도 2~5]: 양이나 빈도를 아주 조금씩 늘려가는 구체적 과정
   - [난이도 6]: 사용자가 꿈꾸는 궁극적이고 완전한 형태의 목표 행동

목표: "${goal.trim()}"

위 원칙을 완벽하게 적용하여 아래 JSON 구조로 응답하세요. (마크다운 \`\`\`json 등의 래핑 없이 오직 순수한 JSON 텍스트 구문만 반환해야 합니다.)

응답 JSON 구조:
{
    "language": "ko",
    "category": "string (health/study/work/etc)",
    "selectedAnchor": "string (구체적인 기존 일상 루틴 기입)",
    "mva": { "title": "string (앵커 직후에 행할 30초 내외의 아주 작은 첫 행동)" },
    "levels": [
        { "title": "난이도 0 (환경 설정/준비)", "difficulty": 0 },
        { "title": "난이도 1 (초소형 행동 MVA)", "difficulty": 1 },
        { "title": "난이도 2", "difficulty": 2 },
        { "title": "난이도 3", "difficulty": 3 },
        { "title": "난이도 4", "difficulty": 4 },
        { "title": "난이도 5", "difficulty": 5 },
        { "title": "난이도 6 (최종 목표 수준)", "difficulty": 6 }
    ],
    "celebrations": ["string", "string", "string"]
}
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
                        generationConfig: { 
                            responseMimeType: 'application/json',
                            maxOutputTokens: 800 // 토큰 과다 사용 방지를 위한 하드 리미트
                        },
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

        // JSON 추출: 가끔 AI가 앞뒤에 대화형 문장을 붙이는 경우를 대비하여 중괄호만 추출
        const firstBrace = resultText.indexOf('{');
        const lastBrace = resultText.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1) {
            resultText = resultText.substring(firstBrace, lastBrace + 1);
        }

        try {
            JSON.parse(resultText);
            return new Response(resultText, { status: 200, headers: corsHeaders });
        } catch (parseError) {
            console.error('JSON Parse error:', parseError, 'Raw Text:', resultText);
            return new Response(JSON.stringify({ error: 'AI가 JSON 형식을 반환하지 않았습니다. (프롬프트 오류 또는 처리 지연)' }), {
                status: 502,
                headers: corsHeaders,
            });
        }

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
