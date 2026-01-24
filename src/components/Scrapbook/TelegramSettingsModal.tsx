
import { useState, useEffect } from 'react';
import './TelegramSettingsModal.css';
import { getTelegramConfig, saveTelegramConfig } from '../../utils/telegram';

interface TelegramSettingsModalProps {
    onClose: () => void;
}

export function TelegramSettingsModal({ onClose }: TelegramSettingsModalProps) {
    const [botToken, setBotToken] = useState('');
    const [chatId, setChatId] = useState('');

    useEffect(() => {
        const config = getTelegramConfig();
        if (config) {
            setBotToken(config.botToken);
            setChatId(config.chatId);
        }
    }, []);

    const handleSave = () => {
        if (!botToken.trim() || !chatId.trim()) {
            alert("Please enter both Bot Token and Chat ID.");
            return;
        }
        saveTelegramConfig(botToken.trim(), chatId.trim());
        onClose();
        alert("Telegram settings saved!");
    };

    return (
        <div className="telegram-modal-overlay" onClick={onClose}>
            <div className="telegram-modal" onClick={e => e.stopPropagation()}>
                <h2>Telegram Settings</h2>
                <div className="form-group">
                    <label>Bot Token</label>
                    <input
                        type="text"
                        value={botToken}
                        onChange={e => setBotToken(e.target.value)}
                        placeholder="123456789:ABCdefGHIjkl..."
                    />
                    <div style={{ fontSize: '0.8em', color: '#868e96', marginTop: '4px' }}>
                        Get this from @BotFather
                    </div>
                </div>
                <div className="form-group">
                    <label>Chat ID</label>
                    <input
                        type="text"
                        value={chatId}
                        onChange={e => setChatId(e.target.value)}
                        placeholder="-100123456789"
                    />
                    <div style={{ fontSize: '0.8em', color: '#868e96', marginTop: '4px' }}>
                        Get this from @getidsbot or similar
                    </div>
                </div>
                <div className="modal-actions">
                    <button className="modal-btn cancel-btn" onClick={onClose}>Cancel</button>
                    <button className="modal-btn save-btn" onClick={handleSave}>Save</button>
                </div>
            </div>
        </div>
    );
}
