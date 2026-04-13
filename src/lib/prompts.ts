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
// Analysis prompt — Claude Vision
// ---------------------------------------------------------------------------

/**
 * Builds the messages array for analysing a Korean literary text image.
 * Claude is asked to respond with structured JSON as a Korean teacher would
 * annotate a passage by hand.
 */
export function getAnalysisMessages(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp"
): Anthropic.MessageParam[] {
  return [
    {
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType,
            data: imageBase64,
          },
        },
        {
          type: "text",
          text: `당신은 수십 년 경력의 국어 교사입니다. 학생들이 지문을 깊이 이해할 수 있도록 전문적이고 꼼꼼한 분석을 제공합니다.

이미지에서 텍스트를 추출하고, 문학적 장치·주제·어휘·구조를 분석하여 반드시 아래 JSON 스키마를 정확히 준수하는 형태로만 응답하세요. 다른 텍스트는 포함하지 마세요.

{
  "extractedText": "이미지에서 추출한 원문 텍스트 전체",
  "literaryDevices": [
    {
      "device": "표현 기법 이름 (예: 은유, 직유, 반복)",
      "quote": "해당 기법이 사용된 원문 구절",
      "explanation": "이 기법이 작품에서 갖는 효과와 의미"
    }
  ],
  "themes": [
    {
      "theme": "주제 또는 핵심 개념",
      "evidence": "이 주제를 뒷받침하는 근거 (원문 인용 포함)"
    }
  ],
  "vocabulary": [
    {
      "word": "어휘 또는 한자어",
      "definition": "뜻풀이",
      "difficulty": "상 | 중 | 하"
    }
  ],
  "structure": [
    {
      "section": "단락 또는 부분 명칭 (예: 1연, 서사, 전환부)",
      "function": "해당 부분의 서사적·논리적 기능",
      "analysis": "세부 분석 내용"
    }
  ]
}`,
        },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Question generation prompt
// ---------------------------------------------------------------------------

/**
 * Builds the messages array for generating Korean exam questions from
 * an extracted passage.
 *
 * @param extractedText  Plain-text passage (from OCR / prior analysis)
 * @param questionType   One of: MULTIPLE_CHOICE | SHORT_ANSWER | FILL_IN_BLANK | VOCABULARY
 * @param count          Number of questions to generate
 */
export function getQuestionMessages(
  extractedText: string,
  questionType: string,
  count: number
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

  return [
    {
      role: "user",
      content: `당신은 수능 및 내신 국어 문제를 전문으로 출제하는 국어 교육 전문가입니다.

다음 지문을 읽고 "${typeLabel}" 유형의 문제를 정확히 ${count}개 출제해 주세요.
${answerNote}
반드시 아래 JSON 배열 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.

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
