export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};
export type Conversation = {
  id: string;
  title: string;
  archived: boolean;
  updatedAt: number;
  messages: Message[];
};
const KEY = "zhaoren.frontend.demo.v1";
export function loadConversations(): Conversation[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(data) ? data.filter(validConversation) : [];
  } catch {
    return [];
  }
}
export function saveConversations(value: Conversation[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function replyTo(text: string): string {
  if (/你好|hello/i.test(text))
    return "你好！我们从一个想法开始。\n\n告诉我你想完成什么，或者选择一个示例，体验这套对话界面。";
  return `收到你的需求：\n\n${text}\n\n这是本地演示回复，没有调用模型、业务接口或外部服务。\n\n你可以继续补充需求，也可以新建会话、切换历史记录，或将当前会话归档。后续可以在这套交互上接入你自己的产品能力。`;
}

function validConversation(value: unknown): value is Conversation {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Conversation>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.archived === "boolean" &&
    typeof item.updatedAt === "number" &&
    Array.isArray(item.messages) &&
    item.messages.every(
      (message) =>
        message &&
        typeof message.id === "string" &&
        ["user", "assistant"].includes(message.role) &&
        typeof message.content === "string" &&
        typeof message.createdAt === "number",
    )
  );
}
