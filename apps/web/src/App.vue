<script setup lang="ts">
import { io } from 'socket.io-client';
import { ref, onMounted, onUnmounted } from 'vue';

interface RoomPlayer {
  id: string;
  username: string;
  isHost: boolean;
  connected: boolean;
}

interface GameRoom {
  code: string;
  hostId: string;
  players: RoomPlayer[];
  playerCount: number;
  maxPlayers: number;
  canStart: boolean;
  status: string;
}

const socket = io("http://localhost:3000", {
  autoConnect: false,
});

const username = ref("");
const roomCode = ref("");

const room = ref<GameRoom | null>(null);
const errorMessage = ref("");

const connected = ref(false);

function createRoom() {
  errorMessage.value = "";
  socket.emit("room:create", username.value);
}

function joinRoom() {
  errorMessage.value = "";
  socket.emit("room:join", {
    code: roomCode.value,
    username: username.value,
  });
}

function leaveRoom() {
  socket.emit("room:leave");
}

onMounted(() => {
  socket.on("connect", () => {
    connected.value = true;
  });

  socket.on("disconnect", () => {
    connected.value = false;
    room.value = null;
  });

  socket.on("room:created", (data: GameRoom) => {
    room.value = data;
  });

  socket.on("room:joined", (data: GameRoom) => {
    room.value = data;
  });

  socket.on("room:updated", (data: GameRoom) => {
    room.value = data;
  });

  socket.on("room:left", () => {
    room.value = null;
  });

  socket.on("room:error", (data: { message: string }) => {
    errorMessage.value = data.message;
  });

  socket.connect();
});

onUnmounted(() => {
  socket.removeAllListeners();
  socket.disconnect();
});
</script>

<template>
  <main>
    <h1>Foursies</h1>

    <p>
      Server Status: {{ connected ? "Connected" : "Disconnected" }}
    </p>

    <template v-if="!room"> 
      <h2>Join a game</h2>

      <input
        v-model="username"
        placeholder="Your username"
        maxlength="20"
      />

      <button
        :disabled="!connected"
        @click="createRoom"
      >
        Create Game
      </button>

      <input
        v-model="roomCode"
        placeholder="Room Code"
        maxlength="6"
      />

      <button
        :disabled="!connected"
        @click="joinRoom"
      >
        Join Room
      </button>
    </template>

    <template v-else>
      <h2>Game Lobby</h2>

      <h3>Room: {{ room.code }}</h3>

      <p>
        Players: {{ room.playerCount }}/{{ room.maxPlayers }}
      </p>

      <h3>Players</h3>

      <ul>
        <li
          v-for="player in room.players"
          :key="player.id"
        >
          {{ player.username }}
          {{ player.isHost ? "(Host)" : "" }}
        </li>
      </ul>

      <button @click="leaveRoom">
        Leave Game
      </button>
    </template>

    <p v-if="errorMessage" style="color: red;">
      {{ errorMessage }}
    </p>
  </main>
</template>
