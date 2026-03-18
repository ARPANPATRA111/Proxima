const rooms = {};

const createRoom = (roomId, roomName, teacherName) => {
  rooms[roomId] = {
    id: roomId,
    name: roomName,
    teacherName,
    students: [],
    reactions: { got_it: 0, confused: 0, too_fast: 0, repeat: 0 },
    attentionScores: {},
    raisedHands: [],
    messages: [],
    activePoll: null,
    pollResponses: {},
    createdAt: Date.now(),
  };
  return rooms[roomId];
};

const getRoom = (roomId) => rooms[roomId] ?? null;
const getAllRooms = () => Object.values(rooms);

const VALID_REACTIONS = new Set(["got_it", "confused", "too_fast", "repeat"]);

const addStudent = (roomId, name) => {
  if (!rooms[roomId]) return;
  if (rooms[roomId].students.includes(name)) return;
  rooms[roomId].students.push(name);
};

const removeStudent = (roomId, name) => {
  if (!rooms[roomId]) return;
  rooms[roomId].students = rooms[roomId].students.filter((s) => s !== name);
};

const updateReaction = (roomId, type) => {
  if (!rooms[roomId]) return;
  if (!VALID_REACTIONS.has(type)) return;
  rooms[roomId].reactions[type] += 1;
};

const updateAttention = (roomId, studentName, score) => {
  if (!rooms[roomId]) return;
  if (typeof score !== "number") return;
  if (score < 0 || score > 100) return;
  rooms[roomId].attentionScores[studentName] = Math.round(score);
};

const raiseHand = (roomId, name) => {
  if (!rooms[roomId]) return;
  if (rooms[roomId].raisedHands.includes(name)) return;
  rooms[roomId].raisedHands.push(name);
};

const lowerHand = (roomId, name) => {
  if (!rooms[roomId]) return;
  rooms[roomId].raisedHands = rooms[roomId].raisedHands.filter(
    (s) => s !== name,
  );
};

const addMessage = (roomId, msg) => {
  if (!rooms[roomId]) return null;
  const message = {
    id: Date.now() + "-" + Math.random().toString(36).slice(2, 8),
    name: msg.name,
    role: msg.role,
    text: msg.text,
    timestamp: Date.now(),
  };
  rooms[roomId].messages.push(message);
  if (rooms[roomId].messages.length > 200) {
    rooms[roomId].messages = rooms[roomId].messages.slice(-200);
  }
  return message;
};

const getMessages = (roomId) => {
  if (!rooms[roomId]) return [];
  return rooms[roomId].messages;
};

const createPoll = (roomId, poll) => {
  if (!rooms[roomId]) return null;
  rooms[roomId].activePoll = {
    id: Date.now().toString(),
    question: poll.question,
    options: poll.options,
    timeoutSec: poll.timeoutSec,
    createdAt: Date.now(),
  };
  rooms[roomId].pollResponses = {};
  return rooms[roomId].activePoll;
};

const submitPollResponse = (roomId, studentName, optionIndex) => {
  if (!rooms[roomId]) return false;
  if (!rooms[roomId].activePoll) return false;
  if (optionIndex < 0 || optionIndex >= rooms[roomId].activePoll.options.length) return false;
  rooms[roomId].pollResponses[studentName] = optionIndex;
  return true;
};

const getPollResults = (roomId) => {
  if (!rooms[roomId]) return null;
  const poll = rooms[roomId].activePoll;
  if (!poll) return null;
  const tally = poll.options.map(() => 0);
  Object.values(rooms[roomId].pollResponses).forEach((idx) => {
    if (idx >= 0 && idx < tally.length) tally[idx]++;
  });
  return {
    poll,
    tally,
    totalResponses: Object.keys(rooms[roomId].pollResponses).length,
    responses: rooms[roomId].pollResponses,
  };
};

const endPoll = (roomId) => {
  if (!rooms[roomId]) return null;
  const results = getPollResults(roomId);
  rooms[roomId].activePoll = null;
  rooms[roomId].pollResponses = {};
  return results;
};

module.exports = {
  createRoom,
  getRoom,
  getAllRooms,
  addStudent,
  removeStudent,
  updateReaction,
  updateAttention,
  raiseHand,
  lowerHand,
  addMessage,
  getMessages,
  createPoll,
  submitPollResponse,
  getPollResults,
  endPoll,
};
