import csv from './csv';
import jsonl from './jsonl';
import excel from './excel';
import { FileFormatDefinition } from './types';

export const fileformats = [csv, jsonl, excel];

export function findFileFormat(storageType): FileFormatDefinition {
  return fileformats.find((x) => x.storageType == storageType);
}

export function getFileFormatDirections(format: FileFormatDefinition) {
  if (!format) return [];
  const res = [];
  if (format.readerFunc) res.push('source');
  if (format.writerFunc) res.push('target');
  return res;
}

export const defaultFileFormat = csv;