import type Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Supported question categories and their Korean exam labels
// ---------------------------------------------------------------------------

const QUESTION_TYPE_LABELS: Record<string, string> = {
  MULTIPLE_CHOICE: "객관식 5지선다 (수능 스타일)",
  SHORT_ANSWER: "서술형/단답형",
  FILL_IN_BLANK: "빈칸 추론",
  VOCABULARY: "어휘·문법 문제",
};

// ---------------------------------------------------------------------------
// Analysis prompt — Korean textbook / reference-book format
// ---------------------------------------------------------------------------

export function getAnalysisMessages(extractedText: string): Anthropic.MessageParam[] {
  return [
    {
      role: "user",
      content: `당신은 수십 년 경력의 국어 교사입니다. 아래 지문을 분석하여 참고서 스타일의 구조화된 JSON을 반환하세요. 다른 텍스트는 절대 포함하지 마세요.

【lines 작성 규칙】
- 원문의 각 행을 lineNum 1부터 시작하는 배열 원소로 분리하세요.
- 각 행에 callouts를 2~4개 달아 주세요. type 규칙:
  - literary : 표현 기법 (은유, 의인화, 반어, 역설, 열거 등)
  - meaning  : 시어·구절의 의미, 화자의 정서, 상징
  - tip      : 핵심 포인트, 수능·내신 출제 포인트
  - teacher  : 교사 해설, 주제와의 연결, 맥락 설명
- callout text는 30자 이내로 간결하게 작성하세요.

【stanzas 작성 규칙】
- 시/소설의 연·단락 단위로 나눠 분석하세요 (3~6개).
- color는 blue → green → orange → purple 순서로 배분하세요.
- label 예시: "1연", "2연", "발단", "전개" 등

【formAnalysis 작성 규칙】
- 형식, 운율, 시점, 어조, 표현법 등 해당하는 항목을 4~6개 작성하세요.
- 장르에 따라 적절히 조정하세요 (소설이면 시점/서술자, 시이면 운율/화자 등).

반드시 아래 JSON 스키마를 정확히 준수하세요:

{
  "title": "작품 제목",
  "author": "작가/지은이",
  "genre": "갈래 (예: 현대시, 단편소설, 수필)",
  "period": "시대 (예: 1930년대, 현대)",
  "theme": "핵심 주제 한 문장",
  "summary": "작품 전체 2~3문장 요약 해설",
  "lines": [
    {
      "lineNum": 1,
      "text": "원문 행",
      "callouts": [
        {
          "id": "c1_1",
          "text": "주석 내용 (30자 이내)",
          "type": "literary | meaning | tip | teacher"
        }
      ]
    }
  ],
  "stanzas": [
    {
      "id": "s1",
      "label": "1연",
      "lineStart": 1,
      "lineEnd": 4,
      "summary": "이 연의 핵심 내용 (15자 이내)",
      "analysis": "이 연의 분석 설명 (60자 이내)",
      "mood": "분위기 키워드 (선택, 10자 이내)",
      "color": "blue"
    }
  ],
  "formAnalysis": [
    { "category": "형식", "value": "자유시 / 정형시 등" },
    { "category": "운율", "value": "내재율 / 외재율 등" },
    { "category": "시점", "value": "1인칭 화자 등" },
    { "category": "어조", "value": "서정적, 회상적 등" }
  ],
  "literaryDevices": [
    {
      "id": "d1",
      "device": "표현 기법명 (예: 은유)",
      "quote": "해당 구절",
      "effect": "효과 설명 (40자 이내)"
    }
  ],
  "vocabulary": [
    {
      "id": "v1",
      "word": "어휘",
      "definition": "뜻풀이",
      "lineNum": 3
    }
  ]
}

<지문>
${extractedText}
</지문>`,
    },
  ];
}

// ---------------------------------------------------------------------------
// Question generation prompt
// ---------------------------------------------------------------------------

export function getQuestionMessages(
  extractedText: string,
  questionType: string,
  count: number,
  analysisContext?: string
): Anthropic.MessageParam[] {
  const typeLabel =
    QUESTION_TYPE_LABELS[questionType] ?? QUESTION_TYPE_LABELS.MULTIPLE_CHOICE;

  const isMultipleChoice = questionType === "MULTIPLE_CHOICE";

  const optionsSchemaLine = isMultipleChoice
    ? `    "options": ["선택지1", "선택지2", "선택지3", "선택지4", "선택지5"],`
    : "";

  const answerNote = isMultipleChoice
    ? 'answer는 정답 선택지 번호(1~5)를 문자열로 기재하세요. options는 반드시 5개.'
    : 'options 필드는 생략하세요. answer는 모범 답안 문자열로 기재하세요.';

  const analysisSection = analysisContext
    ? `\n\n<분석 내용>\n${analysisContext}\n</분석 내용>\n위 분석 내용을 참고하여 주제, 표현 기법, 구조, 어휘 등을 활용한 심화 문제를 출제하세요.`
    : "";

  return [
    {
      role: "user",
      content: `당신은 수능 및 내신 국어 문제를 전문으로 출제하는 국어 교육 전문가입니다.

다음 지문을 읽고 "${typeLabel}" 유형의 문제를 정확히 ${count}개 출제해 주세요.
${answerNote}
반드시 아래 JSON 배열 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.${analysisSection}

[
  {
    "question": "문제 전체 지문 및 발문",
${optionsSchemaLine}
    "answer": "정답",
    "explanation": "해설 (출제 의도 및 오답 근거 포함)"
  }
]

<지문>
${extractedText}
</지문>`,
    },
  ];
}
