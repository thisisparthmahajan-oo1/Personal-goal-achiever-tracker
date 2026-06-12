"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  IndentDecrease,
  IndentIncrease,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type RichEditorProps = {
  /** Initial body. Plain text or Tiptap-authored HTML — both accepted. */
  value: string;
  onChange?: (html: string) => void;
  onBlur?: (html: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
  /** Smaller padding/font for inline forms. */
  compact?: boolean;
  /** Whether the underlying ProseMirror should auto-focus on mount. */
  autoFocus?: boolean;
  /** Disable the editor (e.g. while a pending save is in flight). */
  disabled?: boolean;
};

export function RichEditor({
  value,
  onChange,
  onBlur,
  placeholder,
  className,
  editable = true,
  compact = false,
  autoFocus = false,
  disabled = false,
}: RichEditorProps) {
  // Track the most recent prop value so we can detect "controlled reset" cases
  // (e.g. parent clears the form to "" after submit) and re-sync the editor.
  const lastValueRef = useRef(value);

  const editor = useEditor({
    immediatelyRender: false,
    editable: editable && !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // We ruled code/codeBlock out of scope; disable.
        code: false,
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder: placeholder ?? "",
        showOnlyWhenEditable: true,
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    content: value || "",
    onUpdate({ editor }) {
      const html = editor.getHTML();
      lastValueRef.current = html;
      onChange?.(html);
    },
    onBlur({ editor }) {
      onBlur?.(editor.getHTML());
    },
  });

  // Re-sync when the parent passes a different value (e.g. after a reset).
  useEffect(() => {
    if (!editor) return;
    if (value === lastValueRef.current) return;
    lastValueRef.current = value;
    editor.commands.setContent(value || "", { emitUpdate: false });
  }, [editor, value]);

  // Mirror editable/disabled flips.
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable && !disabled);
  }, [editor, editable, disabled]);

  // Optional autofocus once the editor is ready.
  useEffect(() => {
    if (!editor || !autoFocus) return;
    editor.commands.focus("end");
  }, [editor, autoFocus]);

  return (
    <div
      className={cn(
        "rich-editor relative rounded-xl border border-border/30 bg-card/40 transition-colors focus-within:border-primary/40 focus-within:bg-card/60",
        compact ? "px-3 py-2 text-sm" : "px-4 py-3 text-sm leading-relaxed",
        disabled && "opacity-60",
        className
      )}
    >
      {editor && (
        <BubbleMenu
          editor={editor}
          className="flex items-center gap-0.5 rounded-md border border-border/40 bg-background/95 px-1 py-1 shadow-lg backdrop-blur"
        >
          <ToolbarButton
            active={editor.isActive("bold")}
            label="Bold (⌘B)"
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("italic")}
            label="Italic (⌘I)"
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="size-3.5" />
          </ToolbarButton>
          <Divider />
          <ToolbarButton
            active={editor.isActive("heading", { level: 1 })}
            label="Heading 1"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            <Heading1 className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("heading", { level: 2 })}
            label="Heading 2"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <Heading2 className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("heading", { level: 3 })}
            label="Heading 3"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
          >
            <Heading3 className="size-3.5" />
          </ToolbarButton>
          <Divider />
          <ToolbarButton
            active={editor.isActive("bulletList")}
            label="Bullet list"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive("orderedList")}
            label="Numbered list"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="size-3.5" />
          </ToolbarButton>
          <Divider />
          <ToolbarButton
            label="Outdent (Shift+Tab)"
            onClick={() => editor.chain().focus().liftListItem("listItem").run()}
          >
            <IndentDecrease className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="Indent (Tab)"
            onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
          >
            <IndentIncrease className="size-3.5" />
          </ToolbarButton>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} className="priv" />
    </div>
  );
}

function ToolbarButton({
  active,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // keep selection
        onClick();
      }}
      title={label}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        active && "bg-primary/15 text-primary"
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 inline-block h-4 w-px bg-border/40" />;
}
