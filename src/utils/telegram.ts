
interface TelegramConfig {
    botToken: string;
    chatId: string;
}

export const getTelegramConfig = (): TelegramConfig | null => {
    const botToken = localStorage.getItem('telegram_bot_token');
    const chatId = localStorage.getItem('telegram_chat_id');
    if (botToken && chatId) {
        return { botToken, chatId };
    }
    return null;
};

export const saveTelegramConfig = (botToken: string, chatId: string) => {
    localStorage.setItem('telegram_bot_token', botToken);
    localStorage.setItem('telegram_chat_id', chatId);
};

export const sendToTelegram = async (
    imageBlob: Blob,
    comment?: string,
    tags?: string[]
): Promise<void> => {
    const config = getTelegramConfig();
    if (!config) {
        throw new Error("Telegram configuration missing. Please set Bot Token and Chat ID.");
    }

    const formData = new FormData();
    formData.append('chat_id', config.chatId);
    formData.append('photo', imageBlob, 'capture.png');

    let caption = '';
    if (comment) caption += `${comment}\n\n`;
    if (tags && tags.length > 0) caption += tags.map(t => `#${t}`).join(' ');

    if (caption) {
        formData.append('caption', caption);
    }

    const response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendPhoto`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Telegram API Error: ${errorData.description || response.statusText}`);
    }
};
