import type { QuestionAnswerPair, Service } from "./types.js";

// move to etl.ts ai!
export const generateQuestionAnswerPair = async ({
  service,
  featureToAskAbout,
}: {
  service: Service;
  featureToAskAbout: string;
}): Promise<QuestionAnswerPair> => {
  const { fields, methods, goals } = service;
  let question: string;
  let answer: string;
  switch (featureToAskAbout) {
    case "methods": {
      question = `A service operating in the fields of ${fields.join(", ")}\n`;
      question += `What AI-based methods could it use to accomplish these goals: ${methods.join(", ")}`;
      answer = goals.join(", ");
      break;
    }
    case "fields": {
      question = `A service is using these AI-based methods: ${methods.join(", ")} \n`;
      question += `In pursuit of the following goals: ${goals.join(", ")}\n`;
      question += `In what fields is it operating?`;
      answer = fields.join(", ");
      break;
    }
    case "goals": {
      question = `A service operating in the fields of ${fields.join(", ")} `;
      question += `is using these AI-based methods: ${methods.join(", ")}. `;
      question += `What goals do you think it is trying to accomplish?`;
      answer = goals.join(", ");
      break;
    }
    default:
      throw new Error(`Invalid ask: ${featureToAskAbout}`);
  }

  return { question, answer };
};
