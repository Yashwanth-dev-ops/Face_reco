import React, { useState } from 'react';
import { Theme } from '../types';
import { SettingsCard } from './SettingsCard';
import { ToggleSwitch } from './ToggleSwitch';
import { RadioButton } from './RadioButton';
import { EditProfileModal } from './EditProfileModal';
import { DeleteAccountModal } from './DeleteAccountModal';

interface SettingsScreenProps {
    onBackToDashboard: () => void;
    onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
    onDeleteSelf: (password: string) => Promise<void>;
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
    onBackToDashboard,
    onChangePassword,
    onDeleteSelf,
    theme,
    setTheme
}) => {
    const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
    const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
    
    // States for notification toggles (UI only for now)
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [pushNotifications, setPushNotifications] = useState(false);
    
    return (
        <div className="w-full max-w-md mx-auto flex flex-col animate-slide-up p-4">
            {isChangePasswordModalOpen && (
                <EditProfileModal
                    onClose={() => setIsChangePasswordModalOpen(false)}
                    onChangePassword={onChangePassword}
                />
            )}
            {isDeleteAccountModalOpen && (
                <DeleteAccountModal
                    onClose={() => setIsDeleteAccountModalOpen(false)}
                    onDelete={onDeleteSelf}
                />
            )}
            <header className="flex items-center justify-between w-full mb-6">
                 <button onClick={onBackToDashboard} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
                <div className="w-10"></div>
            </header>

            <main className="w-full space-y-4">
                <SettingsCard title="Profile Management">
                    <div className="flex justify-between items-center">
                        <span>Edit Profile</span>
                        <button onClick={() => setIsChangePasswordModalOpen(true)} className="px-4 py-1.5 text-sm font-semibold text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">Edit</button>
                    </div>
                    <div className="flex justify-between items-center">
                        <span>Change Password</span>
                        <button onClick={() => setIsChangePasswordModalOpen(true)} className="px-4 py-1.5 text-sm font-semibold text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">Change</button>
                    </div>
                </SettingsCard>

                <SettingsCard title="Notification Preferences">
                    <div className="flex justify-between items-center">
                        <span>Email Notifications</span>
                        <ToggleSwitch checked={emailNotifications} onChange={setEmailNotifications} />
                    </div>
                     <div className="flex justify-between items-center">
                        <span>Push Notifications</span>
                        <ToggleSwitch checked={pushNotifications} onChange={setPushNotifications} />
                    </div>
                </SettingsCard>
                
                <SettingsCard title="App Themes" color="teal">
                     <div className="flex justify-between items-center">
                        <span>Dark Theme</span>
                        <RadioButton name="theme" value="dark" checked={theme === 'dark'} onChange={() => setTheme('dark')} />
                    </div>
                     <div className="flex justify-between items-center">
                        <span>Light Theme</span>
                        <RadioButton name="theme" value="light" checked={theme === 'light'} onChange={() => setTheme('light')} />
                    </div>
                </SettingsCard>
                
                <SettingsCard title="Account Management" color="red">
                     <div className="flex justify-between items-center">
                        <span>Delete Account</span>
                        <button onClick={() => setIsDeleteAccountModalOpen(true)} className="px-4 py-1.5 text-sm font-semibold text-white bg-gray-900/80 hover:bg-black rounded-lg transition-colors">Delete</button>
                    </div>
                </SettingsCard>
                
                <SettingsCard title="Help & Support">
                     <div className="flex justify-between items-center">
                        <span>FAQs</span>
                         <button className="px-4 py-1.5 text-sm font-semibold text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">View</button>
                    </div>
                     <div className="flex justify-between items-center">
                        <span>Contact Support</span>
                        <button className="px-4 py-1.5 text-sm font-semibold text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">Contact</button>
                    </div>
                </SettingsCard>
            </main>
        </div>
    );
};
