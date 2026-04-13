import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
} from 'react-native';
import { colors } from '../../constants/colors';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const bgClass = {
    primary: 'bg-primary',
    secondary: 'bg-secondary',
    outline: 'bg-transparent border border-primary',
    ghost: 'bg-transparent',
  }[variant];

  const textClass = {
    primary: 'text-white',
    secondary: 'text-white',
    outline: 'text-primary',
    ghost: 'text-primary',
  }[variant];

  const paddingClass = {
    sm: 'px-3 py-2',
    md: 'px-5 py-3',
    lg: 'px-7 py-4',
  }[size];

  const textSizeClass = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }[size];

  return (
    <TouchableOpacity
      className={`${bgClass} ${paddingClass} rounded-xl items-center justify-center flex-row gap-2 ${disabled || loading ? 'opacity-50' : ''}`}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...rest}
    >
      {loading && <ActivityIndicator size="small" color={colors.text} />}
      <Text className={`${textClass} ${textSizeClass} font-semibold`}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}
