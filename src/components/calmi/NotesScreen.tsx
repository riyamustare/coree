import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Trash2, Mic, MicOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackScreenViewed } from "@/lib/analytics";

interface Note {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

interface NotesScreenProps {
  userId: string;
  onBack: () => void;
}

export function NotesScreen({ userId, onBack }: NotesScreenProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  useEffect(() => {
    trackScreenViewed("notes");
    fetchNotes();
  }, [userId]);

  const fetchNotes = async () => {
    const { data } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    if (data) setNotes(data);
  };

  const handleNewNote = async () => {
    const { data } = await supabase
      .from("notes")
      .insert({ user_id: userId, content: "", title: "Untitled" })
      .select()
      .single();
    if (data) {
      setNotes((prev) => [data, ...prev]);
      setSelectedNote(data);
      setEditContent("");
      setEditTitle("Untitled");
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!selectedNote) return;
    await supabase
      .from("notes")
      .update({ content: editContent, title: editTitle || null })
      .eq("id", selectedNote.id);
    setIsEditing(false);
    setSelectedNote({ ...selectedNote, content: editContent, title: editTitle });
    fetchNotes();
  };

  const handleDelete = async (noteId: string) => {
    await supabase.from("notes").delete().eq("id", noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    if (selectedNote?.id === noteId) {
      setSelectedNote(null);
      setIsEditing(false);
    }
  };

  const handleVoiceInput = useCallback(async () => {
    if (isRecording && mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(",")[1];
          try {
            const { data } = await supabase.functions.invoke("speech-to-text", {
              body: { audio: base64, mimeType: "audio/webm;codecs=opus" },
            });
            if (data?.text) {
              setEditContent((prev) => prev + (prev ? "\n" : "") + data.text);
            }
          } catch (err) {
            console.error("STT error:", err);
          }
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error:", err);
    }
  }, [isRecording, mediaRecorder]);

  const openNote = (note: Note) => {
    setSelectedNote(note);
    setEditContent(note.content);
    setEditTitle(note.title || "");
    setIsEditing(true);
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  // Note editor view
  if (isEditing && selectedNote) {
    return (
      <div className="flex h-[100dvh] flex-col bg-background">
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <button onClick={() => { handleSave(); setIsEditing(false); setSelectedNote(null); }} className="text-sm text-muted-foreground hover:text-foreground transition flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleVoiceInput}
              className={`h-9 w-9 rounded-full flex items-center justify-center transition ${
                isRecording ? "bg-primary text-primary-foreground" : "bg-surface shadow-soft text-foreground"
              }`}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <button onClick={handleSave} className="rounded-xl bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground">
              Save
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Title"
            className="w-full text-xl font-semibold text-foreground bg-transparent border-none outline-none mb-4 placeholder:text-muted-foreground"
          />
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Write your thoughts here..."
            className="w-full flex-1 min-h-[60vh] text-base text-foreground bg-transparent border-none outline-none resize-none leading-relaxed placeholder:text-muted-foreground"
            autoFocus
          />
        </div>
      </div>
    );
  }

  // Notes list
  return (
    <div className="flex min-h-screen flex-col bg-background px-4 py-6">
      <div className="mx-auto w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <button
            onClick={handleNewNote}
            className="h-9 w-9 rounded-full bg-primary flex items-center justify-center shadow-soft hover:opacity-90 transition"
          >
            <Plus className="h-4 w-4 text-primary-foreground" />
          </button>
        </div>

        <h1 className="text-2xl font-semibold text-foreground mb-1">Journal</h1>
        <p className="text-sm text-muted-foreground mb-6">Your private space to write your thoughts</p>

        <div className="space-y-2">
          <AnimatePresence>
            {notes.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                <p className="text-muted-foreground text-sm">No entries yet</p>
                <p className="text-muted-foreground text-xs mt-1">Tap + to start writing</p>
              </motion.div>
            ) : (
              notes.map((note) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="rounded-2xl bg-surface px-5 py-4 shadow-soft flex items-start justify-between gap-3"
                >
                  <button onClick={() => openNote(note)} className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground line-clamp-1">{note.title || "Untitled"}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{note.content || "Empty note"}</p>
                    <p className="text-xs text-muted-foreground mt-2">{formatDate(note.updated_at)}</p>
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="text-muted-foreground hover:text-destructive transition mt-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
