import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  SafeAreaView, ScrollView, StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { model } from "../lib/openrouter";
import { supabase } from "../lib/supabase";
export default function Interview() {
  const router = useRouter();
  const { position } = useLocalSearchParams();
  const [answer, setAnswer] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [answers, setAnswers] = useState<string[]>([]);
  const chat = useRef(
  model.startChat({
    history: [],
  })
);
  useEffect(() => {
  startInterview();
}, []);

const startInterview = async () => {
  try {
    const result = await chat.current.sendMessage(`
You are a professional English interviewer.

Interview position: ${position}.

Ask ONLY question 1 of 5.

Return ONLY the question.
`);

    setQuestion(result.response.text());
    setMessages([
  {
    sender: "ai",
    text: result.response.text(),
  },
]);
  } catch (error) {
    console.log(error);
    setQuestion("Failed to load question.");
  }
};
  const sendAnswer = async () => {
  if (!answer.trim()) return;
  const updatedAnswers = [...answers, answer];
setAnswers(updatedAnswers);

const updatedMessages = [
  ...messages,
  {
    sender: "user",
    text: answer,
  },
];

setMessages(updatedMessages);
  try {
    setLoading(true);

    let prompt = "";

    if (questionNumber < 5) {
      prompt = `
You are a professional English job interviewer.

This is question ${questionNumber} of 5.

Current question:
${question}

Candidate answer:
${answer}

Ask ONLY ONE completely new interview question.
Do not repeat previous questions.
Return ONLY the next interview question.
`;
    } else {
      prompt = `
You are a professional English interviewer.

The candidate has completed all 5 interview questions.

Evaluate the interview.

Interview answers:

${updatedAnswers
  .map((a, i) => `Question ${i + 1}: ${a}`)
  .join("\n\n")}

Return ONLY valid JSON.

Example:

{
  "score": 88,
  "level": "Excellent",
  "strengths": [
    "Good communication",
    "Confidence"
  ],
  "weaknesses": [
    "Grammar",
    "Vocabulary"
  ],
  "suggestions": [
    "Practice speaking every day",
    "Give more examples"
  ]
}

Do not include markdown.
Do not use \`\`\`.
Return JSON only.
Level must be one of:
Excellent
Good
Average
Poor
`;
    }

    const result = await chat.current.sendMessage(prompt);
const response = result.response
  .text()
  .replace(/```json/g, "")
  .replace(/```/g, "")
  .trim();
if (questionNumber === 5) {
  const interviewResult = JSON.parse(response);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { error } = await supabase
  .from("interview_history")
  .insert({
    user_id: user.id,
    position: position,
    score: interviewResult.score,
    level: interviewResult.level,
    strengths: JSON.stringify(interviewResult.strengths),
    weaknesses: JSON.stringify(interviewResult.weaknesses),
    suggestions: JSON.stringify(interviewResult.suggestions),
    conversation: JSON.stringify([
  ...updatedMessages,
  {
    sender: "ai",
    text: `Final Score: ${interviewResult.score}/100 (${interviewResult.level})`,
  },
]),
  });

if (error) {
  console.log(error);
}
  }

  setLoading(false);

  router.push({
    pathname: "/result",
    params: {
      result: JSON.stringify(interviewResult),
    },
  });

  return;
}

console.log(response);

   if (questionNumber < 5) {
  setQuestion(response);

  setMessages((prev) => [
    ...prev,
    {
      sender: "ai",
      text: response,
    },
  ]);

  setQuestionNumber((prev) => prev + 1);
}

    setAnswer("");
  } catch (error) {
    console.log(error);
  }

  setLoading(false);
};
  return (
    <SafeAreaView style={styles.container}>

      <Text style={styles.title}>AI Interview</Text>

      <Text style={styles.subTitle}>
  {position} • Question {Math.min(questionNumber, 5)}/5
</Text>

      <View style={styles.chatCard}>

        <MaterialCommunityIcons
          name="robot-excited-outline"
          size={60}
          color="#2563EB"
        />


        
  <ScrollView
  ref={scrollViewRef}
  style={{ flex: 1 }}
  showsVerticalScrollIndicator={false}
  onContentSizeChange={() =>
    scrollViewRef.current?.scrollToEnd({ animated: true })
  }
>
 {messages.map((msg, index) => (
    <View
      key={index}
      style={{
        alignSelf:
          msg.sender === "user"
            ? "flex-end"
            : "flex-start",
        backgroundColor:
          msg.sender === "user"
            ? "#2563EB"
            : "#E5E7EB",
        padding: 12,
        borderRadius: 12,
        marginVertical: 5,
        maxWidth: "85%",
      }}
    >
      <Text
        style={{
          color:
            msg.sender === "user"
              ? "white"
              : "black",
        }}
      >
        {msg.text}
      </Text>
    </View>
  ))}
</ScrollView> 


<Text style={styles.tip}>
  Answer in English as if you were in a real interview.
</Text>

      </View>

      <TextInput
    placeholder="Type your answer..."
    multiline
    style={styles.input}
    value={answer}
    onChangeText={setAnswer}
/>

      <TouchableOpacity
  style={styles.sendButton}
  onPress={sendAnswer}
  disabled={loading}
>
        <Text style={styles.sendText}>
        {loading ? "Loading..." : "Send Answer"}
        </Text>
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
  flex: 1,
  backgroundColor: "#F4F7FC",
  padding: 20,
},

  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#2563EB",
    textAlign: "center",
  },

  subTitle: {
    textAlign: "center",
    color: "#64748B",
    marginBottom: 30,
    fontSize: 16,
  },

  chatCard: {
  flex: 1,
  backgroundColor: "white",
  borderRadius: 20,
  padding: 25,
  alignItems: "stretch",
  marginBottom: 15,

  shadowColor: "#000",
  shadowOpacity: 0.08,
  shadowRadius: 8,

  elevation: 4,
},

  question: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 15,
    textAlign: "center",
  },

  tip: {
    color: "#6B7280",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 22,
  },

  input: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 18,
    height: 170,
    textAlignVertical: "top",
    marginBottom: 20,
  },

  sendButton: {
    backgroundColor: "#2563EB",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
  },

  sendText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 18,
  },
});