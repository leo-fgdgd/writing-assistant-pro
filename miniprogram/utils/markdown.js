/**
 * 清理 AI 输出中的 Markdown 格式符号
 * 保留纯文本可读性，去掉 # ** * - 等标记符
 */
function cleanMarkdown(text) {
  if (!text || typeof text !== 'string') return text;

  let cleaned = text;

  // 1. 去掉标题 # 符号（保留标题文字）
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');

  // 2. 去掉粗体 **text** → text
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1');

  // 3. 去掉斜体 *text*（但不影响列表项开头的 *）
  cleaned = cleaned.replace(/([^*])\*([^*]+)\*([^*])/g, '$1$2$3');

  // 4. 去掉行内代码 `text` → text
  cleaned = cleaned.replace(/`(.+?)`/g, '$1');

  // 5. 有序列表 1. 2. 保留数字和内容
  // (保留，去掉可能的前导特殊格式)

  // 6. 无序列表 * - 前保留缩进和符号（它们是结构化的）
  // 但去掉多余的装饰线 ---
  cleaned = cleaned.replace(/^-{3,}$/gm, '');

  // 7. 去掉下划线强调 __text__ → text
  cleaned = cleaned.replace(/__(.+?)__/g, '$1');

  // 8. 去掉多余空行（>3 个连续换行 → 2 个换行）
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');

  // 9. 去掉行首多余空格但保留有意缩进
  cleaned = cleaned.replace(/^[ \t]{4,}/gm, '  ');

  return cleaned.trim();
}

module.exports = { cleanMarkdown };
