import React, { useEffect, useRef, useState } from 'react';
import { Editor as MonacoEditor, useMonaco } from '@monaco-editor/react';

interface EditorProps {
    height?: string;
    code: string;
    language: string;
    onChange: (value: string | undefined) => void;
    options?: any;
}

const Editor: React.FC<EditorProps> = ({ height = "100%", code, language, onChange, options = {} }) => {
    const editorRef = useRef(null);
    const monaco = useMonaco();
    const [isEditorReady, setIsEditorReady] = useState(false);

    useEffect(() => {
        if (monaco) {
            monaco.editor.defineTheme('optimizedDark', {
                base: 'vs-dark',
                inherit: true,
                rules: [],
                colors: {
                    'editor.background': '#111827',
                    'editor.foreground': '#F9FAFB',
                    'editor.lineHighlightBackground': '#1E293B',
                    'editorCursor.foreground': '#4F46E5',
                    'editorLineNumber.foreground': '#4B5563',
                    'editorLineNumber.activeForeground': '#E5E7EB',
                }
            });

            monaco.editor.setTheme('optimizedDark');
        }
    }, [monaco]);

    const handleEditorDidMount = (editor, monaco) => {
        editorRef.current = editor;
        setIsEditorReady(true);

        editor.getModel().updateOptions({
            tabSize: 2,
            insertSpaces: true,
            trimAutoWhitespace: true,
        });

        editor.updateOptions({
            renderWhitespace: 'none',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            renderIndentGuides: false,
            renderValidationDecorations: 'editable',
        });
    };

    const defaultOptions = {
        fontSize: 16,
        fontFamily: 'JetBrains Mono, Consolas, monospace',
        wordWrap: 'on',
        lineNumbers: 'on',
        glyphMargin: false,
        folding: true,
        lineDecorationsWidth: 10,
        formatOnType: true,
        formatOnPaste: true,
        automaticLayout: true,
        ...options
    };

    return (
        <MonacoEditor
            height={height}
            defaultLanguage={language}
            language={language}
            value={code}
            onChange={onChange}
            onMount={handleEditorDidMount}
            options={defaultOptions}
            loading={<div className="flex items-center justify-center h-full bg-slate-900">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>}
        />
    );
};

export default React.memo(Editor);
