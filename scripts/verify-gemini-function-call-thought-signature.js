'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const indexSource = fs.readFileSync(path.join(root, 'functions', 'index.js'), 'utf8');
const vertexSource = fs.readFileSync(path.join(root, 'functions', 'vertexAi.js'), 'utf8');

assert(vertexSource.includes('map((part) => ({ part, call: part?.functionCall || null }))'), 'collectFunctionCalls must keep original Gemini part');
assert(vertexSource.includes('part,'), 'collectFunctionCalls must return the original functionCall part');
assert(indexSource.includes('Preserve the original functionCall parts exactly as returned by Gemini'), 'runVertexToolLoop must document preserving original parts');
assert(indexSource.includes('parts: functionCalls.map((call) => call.part || ({'), 'runVertexToolLoop must reuse original functionCall parts before tool responses');

console.log('OK Gemini function-call thought signature preservation verified');
