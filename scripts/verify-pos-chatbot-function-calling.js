'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'functions', 'index.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'functions', 'package.json'), 'utf8'));

assert(pkg.dependencies && pkg.dependencies['@google/genai'], '@google/genai dependency is missing');
assert(source.includes("const { GoogleGenAI, Type } = require('@google/genai');"), 'GoogleGenAI SDK import is missing');
assert(source.includes("const POS_CHATBOT_MODEL = 'gemini-2.5-flash';"), 'askPosChatbot must use gemini-2.5-flash');
assert(source.includes('const getProfitReportTool = {'), 'getProfitReportTool declaration is missing');
assert(source.includes("name: 'getProfitReportTool'"), 'function declaration name must be getProfitReportTool');
assert(source.includes("timeframe: {") && source.includes("required: ['timeframe']"), 'timeframe parameter must exist and be required');
assert(source.includes("enum: ['today', 'current_month', 'last_month']"), 'timeframe enum is missing');
assert(source.includes("sort: {") && source.includes("enum: ['highest', 'lowest']"), 'sort enum is missing');
assert(source.includes('const ai = new GoogleGenAI();'), 'SDK must retain const ai = new GoogleGenAI() initialization fallback');
assert(source.includes('new GoogleGenAI({ apiKey })'), 'SDK must support explicit API key options');
assert(source.includes('vertexai: true'), 'SDK must support Vertex AI fallback for Cloud Functions runtime');
assert(source.includes('async function getProfitReport(args = {})'), 'getProfitReport function is missing');
assert(source.includes("db.collection('history').get()") && source.includes("dataSource: 'firestore-history-readonly'"), 'getProfitReport must read Firestore history read-only');
assert(source.includes('isVisibleHistoryOrderForReports(order)') && source.includes('coerceHistoryDate(order.paidAt || order.timestamp)'), 'getProfitReport must reuse visible-history/date helpers');
assert(source.includes('buildMockProfitReport') && source.includes("bestSellerItem: 'Ốc Nướng Nabi'") && source.includes('profit: 15200000'), 'mock fallback profit report data is missing');
assert(source.includes("dataSource: `mock-${reason}`"), 'mock fallback must label its dataSource reason');
assert(source.includes('ai.models.generateContent({') && source.includes('tools: [getProfitReportTool]'), 'generateContent with tool config is missing');
assert(source.includes('functionResponse: {') && source.includes('parts: functionResponseParts'), 'function response turn is missing');
assert(source.includes('exports.askPosChatbot = onCall({'), 'askPosChatbot callable export is missing');
assert(source.includes('function isTelegramPosChatbotFunctionCallingQuestion'), 'Telegram POS chatbot function-calling detector is missing');
assert(source.includes('tryAnswerTelegramPosChatbotFunctionCalling(userText)'), 'Telegram owner text route must call POS chatbot function-calling path');
assert(source.includes('posChatbotFunctionReply?.text'), 'Telegram owner text route must use POS chatbot function-calling reply before generic fallback');
assert(source.includes('if (!request.auth)') && source.includes("new HttpsError('unauthenticated'"), 'askPosChatbot must require authenticated users');
assert(source.includes("String(request.data?.userMessage || '').trim()"), 'askPosChatbot must read userMessage from request data');
assert(source.includes('usedTool: false') && source.includes('usedTool: true'), 'tool/no-tool response branches are missing');

console.log('OK pos chatbot function calling verified');
