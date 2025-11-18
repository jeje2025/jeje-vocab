import { useState, useRef, useEffect } from 'react';

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
  isEditable?: boolean;
  children?: React.ReactNode;
  inputWidth?: string;
}

export function EditableText({ 
  value, 
  onChange, 
  className = '', 
  style = {},
  multiline = false,
  isEditable = false,
  children,
  inputWidth
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (!isEditable) {
    return <span className={className} style={style}>{value}</span>;
  }

  if (isEditing) {
    const commonProps = {
      ref: inputRef as any,
      value: editValue,
      onChange: (e: any) => setEditValue(e.target.value),
      onBlur: handleSave,
      onKeyDown: handleKeyDown,
      className: `${className} border border-blue-400 bg-blue-50 outline-none`,
      style: { ...style, width: inputWidth || '100%', minWidth: inputWidth ? 'auto' : '200px', padding: '2px 4px' }
    };

    return multiline ? (
      <textarea {...commonProps} rows={3} />
    ) : (
      <input {...commonProps} type="text" />
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className={`${className} cursor-pointer hover:bg-blue-50 print:hover:bg-transparent print:cursor-default font-bold`}
      style={{ ...style, fontFamily: 'SUIT, sans-serif' }}
      title="클릭하여 수정"
    >
      {children || value}
    </span>
  );
}