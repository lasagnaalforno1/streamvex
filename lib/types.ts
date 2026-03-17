export type ClipStatus = "uploading" | "processing" | "ready" | "error";

export type LayoutPreset =
  | "fullscreen_facecam_top"
  | "fullscreen_facecam_bottom"
  | "split";

export interface CropBox {
  x: number;      // 0–1 normalized left edge
  y: number;      // 0–1 normalized top edge
  width: number;  // 0–1
  height: number; // 0–1
}

export interface ClipSegment {
  start: number; // seconds, inclusive
  end: number;   // seconds, exclusive
}

export interface EditConfig {
  trimStart: number;
  trimEnd: number | null;  // null = use full clip duration
  layout: LayoutPreset;
  gameplayCrop: CropBox;
  facecamCrop: CropBox;
  segments?: ClipSegment[]; // optional — when set, overrides trimStart/trimEnd for export
}

export const DEFAULT_EDIT_CONFIG: EditConfig = {
  trimStart: 0,
  trimEnd: null,
  layout: "fullscreen_facecam_top",
  gameplayCrop: { x: 0.05, y: 0.05, width: 0.75, height: 0.75 },
  facecamCrop:  { x: 0.55, y: 0.55, width: 0.35, height: 0.35 },
};

export interface Clip {
  id: string;
  user_id: string;
  title: string;
  status: ClipStatus;
  input_path: string | null;
  output_path: string | null;
  file_size: number | null;
  duration: number | null;
  original_filename: string | null;
  mime_type: string | null;
  error_message: string | null;
  trim_start_seconds: number | null;
  trim_end_seconds: number | null;
  edit_config: EditConfig | null;
  created_at: string;
  updated_at: string;
}
