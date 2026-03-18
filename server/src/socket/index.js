const store = require("../store");

module.exports = function registerSocketHandlers(io, socket) {
  const validate = (payload, fields) => {
    for (const f of fields) {
      if (
        payload?.[f] === undefined ||
        payload?.[f] === null ||
        payload?.[f] === ""
      ) {
        socket.emit("error", { message: `Missing field: ${f}` });
        return false;
      }
    }
    return true;
  };

  socket.on("join_room", ({ roomId, name, role } = {}) => {
    if (!validate({ roomId, name, role }, ["roomId", "name", "role"])) return;

    const prev = socket.data?.roomId;
    if (prev && prev !== roomId) {
      socket.leave(prev);
      if (socket.data.role === "student")
        store.removeStudent(prev, socket.data.name);
    }

    socket.join(roomId);
    socket.data = { roomId, name, role };

    if (role === "student") store.addStudent(roomId, name);

    io.to(roomId).emit("user_joined", { name, role });
    console.log(`[socket] ${name} (${role}) joined ${roomId}`);
  });

  socket.on("student_reaction", ({ roomId, studentName, type } = {}) => {
    if (
      !validate({ roomId, studentName, type }, [
        "roomId",
        "studentName",
        "type",
      ])
    )
      return;

    store.updateReaction(roomId, type);
    const room = store.getRoom(roomId);
    if (!room) return;

    io.to(roomId).emit("reaction_update", {
      from: studentName,
      type,
      counts: room.reactions,
    });
  });

  socket.on("annotation", (data = {}) => {
    if (!validate(data, ["roomId", "x0", "y0", "x1", "y1"])) return;
    socket.to(data.roomId).emit("annotation", data);
  });

  socket.on("annotation_clear", ({ roomId } = {}) => {
    if (!roomId) return;
    io.to(roomId).emit("annotation_clear");
  });

  socket.on("attention_score", ({ roomId, studentName, score } = {}) => {
    if (
      !validate({ roomId, studentName, score }, [
        "roomId",
        "studentName",
        "score",
      ])
    )
      return;

    console.log(`[AttentionTracker] Student: ${studentName} | Room: ${roomId} | Score: ${score}/100`);
    store.updateAttention(roomId, studentName, score);
    const room = store.getRoom(roomId);
    if (!room) return;

    io.to(roomId).emit("attention_update", {
      studentName,
      score,
      allScores: room.attentionScores,
    });
  });

  socket.on("raise_hand", ({ roomId, studentName } = {}) => {
    if (!validate({ roomId, studentName }, ["roomId", "studentName"])) return;
    store.raiseHand(roomId, studentName);
    io.to(roomId).emit("hand_raised", { studentName });
  });

  socket.on("lower_hand", ({ roomId, studentName } = {}) => {
    if (!validate({ roomId, studentName }, ["roomId", "studentName"])) return;
    store.lowerHand(roomId, studentName);
    io.to(roomId).emit("hand_lowered", { studentName });
  });

  socket.on("chat_message", ({ roomId, name, role, text } = {}) => {
    if (!validate({ roomId, name, role, text }, ["roomId", "name", "role", "text"])) return;
    const message = store.addMessage(roomId, { name, role, text });
    if (message) {
      io.to(roomId).emit("new_message", message);
    }
  });

  socket.on("get_messages", ({ roomId } = {}) => {
    if (!roomId) return;
    const messages = store.getMessages(roomId);
    socket.emit("message_history", { messages });
  });

  socket.on("create_poll", ({ roomId, question, options, timeoutSec } = {}) => {
    if (!validate({ roomId, question, options, timeoutSec }, ["roomId", "question", "options", "timeoutSec"])) return;
    if (!Array.isArray(options) || options.length < 2) {
      socket.emit("error", { message: "Poll needs at least 2 options" });
      return;
    }
    const poll = store.createPoll(roomId, { question, options, timeoutSec });
    if (!poll) return;

    io.to(roomId).emit("poll_started", poll);
    console.log(`[Poll] Created in ${roomId}: "${question}" (${timeoutSec}s)`);

    setTimeout(() => {
      const results = store.endPoll(roomId);
      if (results) {
        io.to(roomId).emit("poll_ended", results);
        console.log(`[Poll] Ended in ${roomId}: ${JSON.stringify(results.tally)}`);
      }
    }, timeoutSec * 1000);
  });

  socket.on("submit_poll_response", ({ roomId, studentName, optionIndex } = {}) => {
    if (!validate({ roomId, studentName }, ["roomId", "studentName"])) return;
    if (typeof optionIndex !== "number") return;
    const ok = store.submitPollResponse(roomId, studentName, optionIndex);
    if (ok) {
      socket.emit("poll_response_ack", { success: true });
      const results = store.getPollResults(roomId);
      if (results) {
        io.to(roomId).emit("poll_live_update", {
          tally: results.tally,
          totalResponses: results.totalResponses,
        });
      }
    }
  });

  socket.on("disconnect", (reason) => {
    const { roomId, name, role } = socket.data || {};
    if (!roomId || !name) return;

    if (role === "student") {
      store.removeStudent(roomId, name);
      store.lowerHand(roomId, name);
    }

    io.to(roomId).emit("user_left", { name, role });
    console.log(`[socket] ${name} disconnected — ${reason}`);
  });
};
