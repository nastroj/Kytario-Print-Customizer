/**
 * Shared structural types produced by the ChordPro parser.
 * Kept in their own module so that `chordProParser`, `songParser` and the
 * layout engine can depend on them without circular imports.
 */

export interface ChordChunk {
  chord: string | null;
  text: string;
  isSectionRef?: boolean;
  targetSectionIndex?: number;
}

export interface ParsedLine {
  raw: string;
  isEmpty: boolean;
  chunks: ChordChunk[];
  hasChords: boolean;
  isRepetitionLine?: boolean;
}
