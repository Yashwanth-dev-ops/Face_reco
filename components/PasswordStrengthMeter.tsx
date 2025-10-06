import React, { useMemo } from 'react';

interface PasswordStrengthMeterProps {
  password?: string;
}

const checkPasswordStrength = (password: string) => {
  let score = 0;
  if (!password) return { score: 0, label: '', color: 'bg-gray-500' };

  // Award points for different criteria
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  switch (score) {
    case 0:
    case 1:
    case 2:
      return { score, label: 'Weak', color: 'bg-red-500' };
    case 3:
      return { score, label: 'Medium', color: 'bg-yellow-500' };
    case 4:
    case 5:
      return { score, label: 'Strong', color: 'bg-green-500' };
    default:
      return { score: 0, label: '', color: 'bg-gray-500' };
  }
};

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password = '' }) => {
  const { score, label, color } = useMemo(() => checkPasswordStrength(password), [password]);

  if (!password) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${(score / 5) * 100}%` }}
        ></div>
      </div>
      <span className="text-xs font-semibold text-gray-400 w-16 text-right">{label}</span>
    </div>
  );
};
