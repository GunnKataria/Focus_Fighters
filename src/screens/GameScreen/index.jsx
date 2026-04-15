import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { DEMO_SQUAD, STUDY_PAGES, DEFAULT_QUESTS, BOSS_NAMES, QUIZ_QUESTIONS } from "../../constants";
import { formatTime } from "../../utils/formatTime";
import Btn from "../../components/ui/Btn";
import Modal from "../../components/ui/Modal";
import { SectionTitle } from "../../components/ui/Typography";
import QuizModal from "../../components/game/QuizModal";
import LeftPanel from "./LeftPanel";
import RightPanel from "./RightPanel";
import StudyTab from "./tabs/StudyTab";
import FlashcardTab from "./tabs/FlashcardTab";
import NotesTab from "./tabs/NotesTab";
import AiTab from "./tabs/AiTab";
import { usePhoneStatusListener } from "../../hooks/usePhoneStatusListener";

// ── Dynamic Boss HP formula ────────────────────────────────────────────────────
// Boss Max HP = Session Duration (minutes) × Number of Players × 20
function calcBossMaxHP(durationMinutes, playerCount) {
  return Math.max(200, durationMinutes * Math.max(1, playerCount) * 20);
}

export default function GameScreen({ player, room, onUpdatePlayer, onGoLobby }) {
  const { push, multiplayer } = useApp();
  const { profile } = useAuth();
  const liveMembers = multiplayer?.liveMembers ?? [];
  const liveRoom    = multiplayer?.liveRoom ?? room;

  const { getPhoneStatus } = usePhoneStatusListener(liveRoom?.id);

  // ── Squad (remote members minus self) ─────────────────────────────────────────
  const remoteSquad = useMemo(() => {
    if (!liveMembers.length) return DEMO_SQUAD.map((p) => ({ ...p }));
    return liveMembers
      .filter((m) => m.user_id !== profile?.id)
      .map((m) => ({
        id:     m.user_id,
        name:   m.display_name,
        avatar: m.avatar_emoji,
        photo:  m.photo_url,
        status: m.status || "focused",
      }));
  }, [liveMembers, profile?.id]);

  // ── Dynamic Boss HP: computed once on mount ───────────────────────────────────
  const totalPlayerCount  = 1 + remoteSquad.length;
  const sessionDuration   = liveRoom?.duration || room?.duration || 25;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const computedBossMaxHP = useMemo(() => calcBossMaxHP(sessionDuration, totalPlayerCount), []);

  // ── Shared session clock ──────────────────────────────────────────────────────
  const initialSeconds = (() => {
    const dur = sessionDuration * 60;
    const startedAt = liveRoom?.started_at || room?.started_at;
    if (!startedAt) return dur;
    const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    return Math.max(0, dur - elapsed);
  })();

  // ── Combat state ──────────────────────────────────────────────────────────────
  const [bossHP, setBossHP]           = useState(computedBossMaxHP);
  const [bossMaxHP]                    = useState(computedBossMaxHP);
  const [teamHP, setTeamHP]           = useState(500);
  const [teamMaxHP]                    = useState(500);
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [focused, setFocused]         = useState(true);
  const [focusStreak, setFocusStreak] = useState(0);
  const [totalDamage, setTotalDamage] = useState(0);
  const [squad, setSquad]             = useState(() => remoteSquad);
  const [damageNums, setDamageNums]   = useState([]);
  const [bossShaking, setBossShaking] = useState(false);
  const [teamHpShaking, setTeamHpShaking] = useState(false);
  const [combatLog, setCombatLog]     = useState([
    { msg: `⚔️ Boss raid started! Boss HP: ${computedBossMaxHP} (${sessionDuration}min × ${totalPlayerCount} players)`, type: "info" },
  ]);
  const [sessionRunning, setSessionRunning] = useState(true);

  // ── Boss animation state ──────────────────────────────────────────────────────
  // States: idle | hurt | roar | enraged | defeated
  const [bossState, setBossState]   = useState("idle");
  const bossStateTimerRef           = useRef(null);

  const triggerBossState = useCallback((state, durationMs = 800) => {
    clearTimeout(bossStateTimerRef.current);
    setBossState(state);
    if (state !== "defeated") {
      bossStateTimerRef.current = setTimeout(() => setBossState("idle"), durationMs);
    }
  }, []);

  // ── Full-Screen state ─────────────────────────────────────────────────────────
  const [isFullscreen, setIsFullscreen]       = useState(false);
  const [fullscreenPaused, setFullscreenPaused] = useState(false);
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  // Request fullscreen on mount (desktop only)
  useEffect(() => {
    if (isMobile) return;
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen;
    if (req) req.call(el).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track fullscreen changes
  useEffect(() => {
    if (isMobile) return;
    const onFSChange = () => {
      const inFS = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement
      );
      setIsFullscreen(inFS);
      if (!inFS && sessionRunningRef.current) {
        setFullscreenPaused(true);
      } else if (inFS) {
        setFullscreenPaused(false);
      }
    };
    document.addEventListener("fullscreenchange", onFSChange);
    document.addEventListener("webkitfullscreenchange", onFSChange);
    document.addEventListener("mozfullscreenchange", onFSChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFSChange);
      document.removeEventListener("webkitfullscreenchange", onFSChange);
      document.removeEventListener("mozfullscreenchange", onFSChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  const handleResumeFullscreen = useCallback(() => {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen;
    if (req) {
      req.call(el)
        .then(() => setFullscreenPaused(false))
        .catch(() => setFullscreenPaused(false));
    } else {
      setFullscreenPaused(false);
    }
  }, []);

  // ── UI state ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]             = useState("study");
  const [currentPage, setCurrentPage]         = useState(0);
  const [currentCard, setCurrentCard]         = useState(0);
  const [cardFlipped, setCardFlipped]         = useState(false);
  const [cardAnswered, setCardAnswered]       = useState(false);
  const [quests, setQuests]                   = useState(DEFAULT_QUESTS.map((q) => ({ ...q })));
  const [questInput, setQuestInput]           = useState("");
  const [notes, setNotes]                     = useState("");
  const [notesLoading, setNotesLoading]       = useState(false);
  const [aiMessages, setAiMessages]           = useState([
    { role: "ai", text: "Greetings, warrior! Ask me anything about the study material to gain knowledge and defeat the boss! ⚔️" },
  ]);
  const [aiInput, setAiInput]                 = useState("");
  const [aiLoading, setAiLoading]             = useState(false);

  // ── Modals ────────────────────────────────────────────────────────────────────
  const [engageOpen, setEngageOpen]         = useState(false);
  const [engageTimer, setEngageTimer]       = useState(7);
  const [victoryOpen, setVictoryOpen]       = useState(false);
  const [defeatOpen, setDefeatOpen]         = useState(false);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [quizOpen, setQuizOpen]             = useState(false);
  const [quizComplete, setQuizComplete]     = useState(null);
  const [xpReward, setXpReward]             = useState(0);
  const [coinsReward, setCoinsReward]       = useState(0);

  // ── Refs ──────────────────────────────────────────────────────────────────────
  const gameLoopRef         = useRef(null);
  const engageIntervalRef   = useRef(null);
  const engageTimeoutRef    = useRef(null);
  const focusedRef          = useRef(true);
  const sessionRunningRef   = useRef(true);
  const fullscreenPausedRef = useRef(false);
  const bossHPRef           = useRef(computedBossMaxHP);
  const teamHPRef           = useRef(500);
  const secondsRef          = useRef(initialSeconds);
  const totalDamageRef      = useRef(0);
  const focusStreakRef       = useRef(0);
  const squadRef            = useRef(remoteSquad);
  const getPhoneStatusRef   = useRef(getPhoneStatus);

  // Keep refs in sync
  useEffect(() => { squadRef.current = remoteSquad; setSquad(remoteSquad); }, [remoteSquad]);
  useEffect(() => { focusedRef.current = focused; }, [focused]);
  useEffect(() => { bossHPRef.current = bossHP; }, [bossHP]);
  useEffect(() => { teamHPRef.current = teamHP; }, [teamHP]);
  useEffect(() => { fullscreenPausedRef.current = fullscreenPaused; }, [fullscreenPaused]);
  useEffect(() => { getPhoneStatusRef.current = getPhoneStatus; }, [getPhoneStatus]);

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const addLog = useCallback((msg, type = "info") => {
    setCombatLog((prev) => [{ msg, type }, ...prev.slice(0, 19)]);
  }, []);

  const spawnDmgNum = useCallback((dmg, critical = false) => {
    const id = Date.now() + Math.random();
    setDamageNums((prev) => [...prev, { id, dmg, critical, x: Math.random() * 60 - 30 }]);
    setTimeout(() => setDamageNums((prev) => prev.filter((d) => d.id !== id)), 1200);
  }, []);

  const addXP = useCallback(
    (amount) => {
      onUpdatePlayer((prev) => {
        let xp = prev.xp + amount;
        let level = prev.level;
        let xpToNext = prev.xpToNext;
        while (xp >= xpToNext) {
          xp -= xpToNext;
          level++;
          xpToNext = Math.floor(xpToNext * 1.5);
          push(`🎉 Level Up! Now Level ${level}!`, "gold");
        }
        return { ...prev, xp, level, xpToNext };
      });
    },
    [onUpdatePlayer, push]
  );

  // ── End session ───────────────────────────────────────────────────────────────
  const endSession = useCallback(
    (reason) => {
      sessionRunningRef.current = false;
      setSessionRunning(false);
      clearInterval(gameLoopRef.current);
      clearTimeout(engageTimeoutRef.current);
      clearInterval(engageIntervalRef.current);
      setEngageOpen(false);

      if (reason === "defeat") {
        const px = Math.floor(totalDamageRef.current / 10);
        addXP(px);
        setDefeatOpen(true);
      } else {
        const xpE    = 100 + Math.floor(totalDamageRef.current / 5);
        const coinsE = 20 + Math.floor((bossMaxHP - Math.max(0, bossHPRef.current)) / 50);
        addXP(xpE);
        onUpdatePlayer((p) => ({ ...p, coins: p.coins + coinsE }));
        setXpReward(xpE);
        setCoinsReward(coinsE);
        setVictoryOpen(true);
        if (reason === "victory") triggerBossState("defeated", 999999);
      }
    },
    [addXP, onUpdatePlayer, bossMaxHP, triggerBossState]
  );

  // ── Game loop ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const loop = () => {
      if (!sessionRunningRef.current) return;
      // Pause while fullscreen is lost (desktop only)
      if (fullscreenPausedRef.current && !isMobile) return;

      secondsRef.current--;
      setSecondsLeft(secondsRef.current);

      // ── Strict focus rules ───────────────────────────────────────────────────
      // Boss only takes damage when:
      //   1. Local player is focused
      //   2. 100% of squad members are focused
      //   3. No one's phone is in distract mode (phone_locked_in !== false)
      const myFocus         = focusedRef.current;
      const allSquadFocused = squadRef.current.every((p) => p.status === "focused");
      const gps             = getPhoneStatusRef.current;
      const selfPhoneOk     = gps(profile?.id)?.isLockedIn !== false;
      const squadPhoneOk    = squadRef.current.every((p) => gps(p.id)?.isLockedIn !== false);
      const strictFocused   = myFocus && allSquadFocused && selfPhoneOk && squadPhoneOk;

      const totalFocused = (myFocus ? 1 : 0) + squadRef.current.filter((p) => p.status === "focused").length;
      const dps          = strictFocused ? totalFocused * 3 + 2 : 0;

      if (strictFocused) {
        focusStreakRef.current++;
        setFocusStreak(focusStreakRef.current);
        if (focusStreakRef.current % 10 === 0) {
          const bonus = Math.floor(focusStreakRef.current / 10) * 5;
          bossHPRef.current = Math.max(0, bossHPRef.current - bonus);
          setBossHP(bossHPRef.current);
          totalDamageRef.current += bonus;
          setTotalDamage(totalDamageRef.current);
          spawnDmgNum(bonus, true);
          triggerBossState("hurt", 600);
          addLog(`🔥 Focus streak! +${bonus} bonus dmg`, "gold");
        }
      } else {
        focusStreakRef.current = 0;
        setFocusStreak(0);

        // Boss counter-attacks when focus is broken
        if (Math.random() < 0.15) {
          const atk = 15 + Math.floor(Math.random() * 20);
          teamHPRef.current = Math.max(0, teamHPRef.current - atk);
          setTeamHP(teamHPRef.current);
          setTeamHpShaking(true);
          setTimeout(() => setTeamHpShaking(false), 500);
          setBossShaking(true);
          setTimeout(() => setBossShaking(false), 500);
          triggerBossState("roar", 600);
          addLog(`💥 Boss attacks! Team takes ${atk} damage!`, "danger");
        }
      }

      // Apply DPS (only if all focused)
      if (dps > 0) {
        const prevHP = bossHPRef.current;
        bossHPRef.current = Math.max(0, bossHPRef.current - dps);
        setBossHP(bossHPRef.current);
        totalDamageRef.current += dps;
        setTotalDamage(totalDamageRef.current);
        spawnDmgNum(dps);
        triggerBossState("hurt", 500);
        // Enrage at < 25% HP
        if (bossHPRef.current > 0 && bossHPRef.current < bossMaxHP * 0.25 && prevHP >= bossMaxHP * 0.25) {
          triggerBossState("enraged", 1500);
          addLog("😡 Boss ENRAGED at 25% HP!", "danger");
          push("😡 Boss ENRAGED!", "danger");
        }
      }

      // Simulate squad behavior
      const updatedSquad = squadRef.current.map((p) => {
        if (Math.random() < 0.02) {
          const newStatus = p.status === "focused" ? "distracted" : "focused";
          if (newStatus === "distracted") addLog(`⚠️ ${p.name} got distracted!`, "danger");
          else addLog(`✅ ${p.name} refocused!`, "success");
          return { ...p, status: newStatus };
        }
        return p;
      });
      squadRef.current = updatedSquad;
      setSquad([...updatedSquad]);

      if (Math.random() < 0.08 && strictFocused) {
        onUpdatePlayer((p) => ({ ...p, xp: p.xp + 1 }));
      }

      if (secondsRef.current <= 0) { endSession("timeout"); return; }
      if (bossHPRef.current <= 0)  { endSession("victory"); return; }
      if (teamHPRef.current <= 0)  { endSession("defeat");  return; }
    };

    gameLoopRef.current = setInterval(loop, 1000);
    return () => clearInterval(gameLoopRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addLog, spawnDmgNum, endSession, onUpdatePlayer, isMobile, triggerBossState, bossMaxHP]);

  // ── Engagement checks ──────────────────────────────────────────────────────────
  const scheduleEngage = useCallback(() => {
    const delay = (30 + Math.floor(Math.random() * 60)) * 1000;
    engageTimeoutRef.current = setTimeout(() => {
      if (!sessionRunningRef.current) return;
      let t = 7;
      setEngageTimer(t);
      setEngageOpen(true);
      engageIntervalRef.current = setInterval(() => {
        t--;
        setEngageTimer(t);
        if (t <= 0) {
          clearInterval(engageIntervalRef.current);
          setEngageOpen(false);
          setFocused(false);
          focusedRef.current = false;
          addLog("⚠️ Focus check missed!", "danger");
          push("⚠️ Focus check missed! Boss attacking!", "danger");
          scheduleEngage();
        }
      }, 1000);
    }, delay);
  }, [addLog, push]);

  useEffect(() => {
    scheduleEngage();
    return () => {
      clearTimeout(engageTimeoutRef.current);
      clearInterval(engageIntervalRef.current);
    };
  }, [scheduleEngage]);

  // ── Tab visibility ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      if (!sessionRunningRef.current) return;
      const hidden = document.hidden;
      setFocused(!hidden);
      focusedRef.current = !hidden;
      if (hidden) {
        addLog("⚠️ Tab hidden — focus lost!", "danger");
        push("⚠️ Switched away! Focus lost!", "danger");
      } else {
        addLog("✅ Returned to focus.", "success");
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [addLog, push]);

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleEngageRespond = () => {
    clearInterval(engageIntervalRef.current);
    setEngageOpen(false);
    setFocused(true);
    focusedRef.current = true;
    const bonus = 30;
    bossHPRef.current = Math.max(0, bossHPRef.current - bonus);
    setBossHP(bossHPRef.current);
    totalDamageRef.current += bonus;
    setTotalDamage(totalDamageRef.current);
    spawnDmgNum(bonus, true);
    triggerBossState("hurt", 600);
    addXP(5);
    addLog(`⚡ Engagement check passed! +${bonus} dmg`, "gold");
    push("⚡ Focus verified! Bonus damage!", "success");
    scheduleEngage();
  };

  const handleToggleFocus = () => {
    setFocused((f) => {
      focusedRef.current = !f;
      push(!f ? "🟢 Back in focus!" : "🔴 Distracted! Boss attacking!", !f ? "success" : "danger");
      return !f;
    });
  };

  const generateNotes = async () => {
    setNotesLoading(true);
    const material = STUDY_PAGES.map(
      (p, i) =>
        `Page ${i + 1}: ${p.title}\n${p.content
          .map((b) => b.text || (b.items || []).join(", "))
          .join(" ")}`
    ).join("\n\n");
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: "Generate structured HTML study notes. Use <h3> for headings, <p> for paragraphs, <ul><li> for bullets, <strong> for key terms. No html/body tags. Under 600 words. Return only the HTML, no markdown code fences." }] },
            contents: [{ role: "user", parts: [{ text: `Generate notes from:\n${material}` }] }],
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setNotesLoading(false);
        return;
      }
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || fallbackNotes();
      setNotes(text);
    } catch {
      setNotes(fallbackNotes());
    }
    setNotesLoading(false);
    setNotesModalOpen(true);
    addXP(20);
    push("✨ Notes generated! +20 XP", "gold");
    addLog("📋 Notes generated for the squad!", "gold");
  };

  const fallbackNotes = () =>
    `<h3>⚛️ Quantum Mechanics</h3><p>Quantum mechanics describes atomic-scale behavior with probabilistic outcomes.</p><h3>Core Principles</h3><ul><li><strong>Wave-Particle Duality:</strong> Quantum objects show both wave and particle properties</li><li><strong>Superposition:</strong> Particles in multiple states simultaneously</li><li><strong>Uncertainty Principle:</strong> Δx·Δp ≥ ℏ/2</li></ul>`;

  const sendAi = async (overrideMsg) => {
    const msg = (typeof overrideMsg === "string" ? overrideMsg : aiInput).trim();
    if (!msg || aiLoading) return;
    setAiInput("");
    setAiMessages((prev) => [...prev, { role: "user", text: msg }]);
    setAiLoading(true);
    const material = STUDY_PAGES[currentPage]?.content
      .map((b) => b.text || (b.items || []).join(", "))
      .join(" ")
      .substring(0, 600) || "";
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: `You are an RPG-themed AI study assistant in Focus Fighters. Current study material:\n${material}\nBe concise (<120 words), slightly dramatic, and helpful. Use 1-2 emoji max.` }] },
            contents: [{ role: "user", parts: [{ text: msg }] }],
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setAiMessages((prev) => [...prev, { role: "ai", text: `⚠️ Oracle error (${res.status}). Try again!` }]);
        setAiLoading(false);
        return;
      }
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "The arcane connection faltered… try again.";
      setAiMessages((prev) => [...prev, { role: "ai", text }]);
    } catch {
      setAiMessages((prev) => [...prev, { role: "ai", text: "The oracle is unavailable. Study the scrolls directly! 📜" }]);
    }
    setAiLoading(false);
  };

  // ── Derived values ─────────────────────────────────────────────────────────────
  const myPhoneStatus   = getPhoneStatus(profile?.id);
  const selfPhoneOk     = myPhoneStatus?.isLockedIn !== false;
  const squadPhoneOk    = squad.every((p) => getPhoneStatus(p.id)?.isLockedIn !== false);
  const allSquadFocused = squad.every((p) => p.status === "focused");
  const strictFocused   = focused && allSquadFocused && selfPhoneOk && squadPhoneOk;

  const dps = strictFocused
    ? ((focused ? 1 : 0) + squad.filter((p) => p.status === "focused").length) * 3 + 2
    : 0;

  const allPlayers = [
    { ...player, status: focused ? "focused" : "distracted", phoneStatus: getPhoneStatus(profile?.id) },
    ...squad.map((member) => ({ ...member, phoneStatus: getPhoneStatus(member.id) })),
  ];

  // ── Boss display emoji based on state ──────────────────────────────────────────
  const bossEmoji = room?.boss || "🐲";
  let bossDisplay, bossClass;
  if (bossState === "defeated") {
    bossDisplay = "💀";
    bossClass   = "boss-defeated";
  } else if (bossState === "enraged") {
    bossDisplay = `${bossEmoji}`;
    bossClass   = "boss-roar";
  } else if (bossState === "hurt") {
    bossDisplay = `${bossEmoji}`;
    bossClass   = "boss-hurt";
  } else if (bossState === "roar") {
    bossDisplay = `${bossEmoji}`;
    bossClass   = "boss-roar";
  } else {
    bossDisplay = bossEmoji;
    bossClass   = bossShaking ? "boss-attacking" : "boss-idle";
  }

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "270px 1fr 250px",
        gridTemplateRows: "auto 1fr auto",
        position: "relative",
        zIndex: 1,
      }}
    >
      {/* ── FULLSCREEN PAUSE OVERLAY ────────────────────────────────────────────── */}
      {fullscreenPaused && !isMobile && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(10,8,16,0.93)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1.5rem",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Animated warning border */}
          <div
            style={{
              position: "absolute",
              inset: 8,
              borderRadius: 16,
              border: "3px solid rgba(224,57,90,.6)",
              pointerEvents: "none",
              animation: "fullscreen-pulse 1.5s ease-in-out infinite",
            }}
          />
          <div style={{ fontSize: "5rem", lineHeight: 1 }}>⚠️</div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.8rem, 4vw, 3rem)",
              color: "var(--accent-red)",
              textShadow: "0 0 40px rgba(224,57,90,.9), 0 0 80px rgba(224,57,90,.4)",
              letterSpacing: ".15em",
              textAlign: "center",
            }}
          >
            GAME PAUSED
          </div>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "1rem",
              color: "var(--text-muted)",
              textAlign: "center",
              maxWidth: 420,
              lineHeight: 1.7,
            }}
          >
            You exited full-screen mode.<br />
            Full-screen is <strong style={{ color: "var(--accent-gold)" }}>required</strong> to keep your focus session fair.<br />
            The boss is patiently waiting for your return…
          </div>
          <div
            style={{
              padding: ".5rem 1.25rem",
              background: "rgba(224,57,90,.1)",
              border: "1px solid rgba(224,57,90,.3)",
              borderRadius: 8,
              fontFamily: "var(--font-heading)",
              fontSize: ".82rem",
              color: "var(--accent-red)",
            }}
          >
            🕒 Session timer is paused
          </div>
          <Btn variant="danger" size="lg" onClick={handleResumeFullscreen}
            style={{ fontSize: "1rem", padding: ".75rem 2.5rem", marginTop: ".5rem" }}>
            🖥️ Return to Full-Screen
          </Btn>
        </div>
      )}

      {/* LEFT PANEL */}
      <LeftPanel
        room={room}
        bossHP={bossHP}
        bossMaxHP={bossMaxHP}
        teamHP={teamHP}
        teamMaxHP={teamMaxHP}
        bossShaking={bossShaking}
        teamHpShaking={teamHpShaking}
        damageNums={damageNums}
        allPlayers={allPlayers}
        dps={dps}
        totalDamage={totalDamage}
        secondsLeft={secondsLeft}
        focusStreak={focusStreak}
        focused={focused}
        onToggleFocus={handleToggleFocus}
        bossClass={bossClass}
        bossDisplay={bossDisplay}
        bossState={bossState}
        strictFocused={strictFocused}
      />

      {/* TOP BAR */}
      <header
        style={{
          gridColumn: 2,
          gridRow: 1,
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border)",
          padding: ".7rem 1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: ".9rem",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: 200,
          }}
        >
          {room?.name || "Boss Raid"}
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
          {[["study","📖 Study"],["flashcard","🃏 Cards"],["notes","📋 Notes"],["chat","🤖 AI"]].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              fontFamily: "var(--font-heading)", fontSize: ".68rem", letterSpacing: ".08em",
              textTransform: "uppercase", padding: ".45rem .9rem",
              background: activeTab === id ? "rgba(124,92,224,.2)" : "transparent",
              border: "none", borderRight: "1px solid var(--border)",
              color: activeTab === id ? "var(--accent-violet)" : "var(--text-muted)",
              cursor: "pointer", transition: "all .2s",
            }}>{label}</button>
          ))}
        </div>

        <div style={{ display: "flex", gap: ".75rem", alignItems: "center" }}>
          {/* Squad focus status badge */}
          <span style={{
            fontFamily: "var(--font-heading)", fontSize: ".7rem",
            padding: ".22rem .6rem", borderRadius: 10,
            background: strictFocused ? "rgba(82,224,122,.15)" : "rgba(224,57,90,.15)",
            color: strictFocused ? "var(--accent-green)" : "var(--accent-red)",
            border: `1px solid ${strictFocused ? "rgba(82,224,122,.4)" : "rgba(224,57,90,.4)"}`,
          }}>
            {strictFocused ? "⚔️ Full Squad Focused" : "⛔ Damage Paused"}
          </span>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: ".9rem", color: "var(--accent-gold)", minWidth: 50, textAlign: "right" }}>
            {formatTime(secondsLeft)}
          </span>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: ".8rem", color: "var(--text-secondary)" }}>
            ⚡ {player.xp} XP
          </span>
          {!isMobile && (
            <button
              onClick={isFullscreen
                ? () => (document.exitFullscreen || document.webkitExitFullscreen || (() => {})).call(document)
                : handleResumeFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Go fullscreen"}
              style={{
                background: "transparent", border: "1px solid var(--border)",
                borderRadius: 4, color: isFullscreen ? "var(--accent-green)" : "var(--text-muted)",
                cursor: "pointer", fontSize: ".85rem", padding: ".28rem .5rem",
              }}
            >
              {isFullscreen ? "⛶" : "⛶"}
            </button>
          )}
        </div>
      </header>

      {/* CENTER MAIN */}
      <main style={{ gridColumn: 2, gridRow: 2, padding: "1rem 1.25rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
        {activeTab === "study" && <StudyTab currentPage={currentPage} setCurrentPage={setCurrentPage} generateNotes={generateNotes} notesLoading={notesLoading} />}
        {activeTab === "flashcard" && (
          <FlashcardTab
            currentCard={currentCard} setCurrentCard={setCurrentCard}
            cardFlipped={cardFlipped} setCardFlipped={setCardFlipped}
            cardAnswered={cardAnswered} setCardAnswered={setCardAnswered}
            onCorrectAnswer={() => {
              const bonus = 25 + Math.floor(Math.random() * 15);
              bossHPRef.current = Math.max(0, bossHPRef.current - bonus);
              setBossHP(bossHPRef.current);
              totalDamageRef.current += bonus;
              setTotalDamage(totalDamageRef.current);
              spawnDmgNum(bonus);
              triggerBossState("hurt", 600);
              addXP(10);
              push(`✅ Correct! +${bonus} bonus damage!`, "success");
              addLog(`🃏 Correct! Bonus: +${bonus} dmg`, "gold");
            }}
            onWrongAnswer={() => {
              push("❌ Wrong — no bonus damage", "danger");
              addLog("🃏 Wrong answer!", "danger");
            }}
          />
        )}
        {activeTab === "notes" && <NotesTab notes={notes} push={push} />}
        {activeTab === "chat" && <AiTab aiMessages={aiMessages} aiLoading={aiLoading} aiInput={aiInput} setAiInput={setAiInput} sendAi={sendAi} />}
      </main>

      {/* BOTTOM BAR */}
      <footer style={{ gridColumn: 2, gridRow: 3, background: "var(--bg-surface)", borderTop: "1px solid var(--border)", padding: ".6rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <span style={{ fontFamily: "var(--font-heading)", fontSize: ".78rem", color: "var(--text-secondary)" }}>
          ⚡ DPS: <strong style={{ color: strictFocused ? "var(--accent-violet)" : "var(--text-muted)" }}>{dps}</strong>
        </span>
        <span style={{ fontFamily: "var(--font-heading)", fontSize: ".78rem", color: "var(--text-secondary)" }}>
          ❤️ Team: <strong style={{ color: "var(--accent-green)" }}>{Math.ceil(teamHP)}</strong>
        </span>
        <div style={{ flex: 1 }} />
        {/* Individual focus status row */}
        <div style={{ display: "flex", gap: ".4rem", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: ".68rem", color: focused ? "var(--accent-green)" : "var(--accent-red)" }}>{focused ? "🟢 You" : "🔴 You"}</span>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: ".68rem", color: allSquadFocused ? "var(--accent-green)" : "var(--accent-red)" }}>{allSquadFocused ? "🟢 Squad" : "🔴 Squad"}</span>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: ".68rem", color: selfPhoneOk && squadPhoneOk ? "var(--accent-green)" : "var(--accent-red)" }}>{selfPhoneOk && squadPhoneOk ? "📱🔒" : "📱⚠️"}</span>
        </div>
        <div style={{ flex: 1 }} />
        <Btn variant="ghost" size="sm" onClick={() => { if (window.confirm("End session early?")) endSession("timeout"); }}>End Session</Btn>
      </footer>

      {/* RIGHT PANEL */}
      <RightPanel
        quests={quests} setQuests={setQuests}
        questInput={questInput} setQuestInput={setQuestInput}
        player={player} focusStreak={focusStreak} combatLog={combatLog}
        onQuestComplete={() => { addXP(5); push("✅ Quest complete! +5 XP", "success"); }}
      />

      {/* ── MODALS ── */}
      <Modal open={engageOpen} maxWidth={360}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem" }}>⚡</div>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem", color: "var(--accent-gold)", margin: ".5rem 0" }}>Focus Check!</div>
          <p style={{ color: "var(--text-muted)", fontSize: ".9rem", marginBottom: ".5rem" }}>Are you still with us, warrior?</p>
          <div className="timer-pulse" style={{ width: 76, height: 76, borderRadius: "50%", border: "3px solid var(--accent-gold)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: "1.8rem", color: "var(--accent-gold)", margin: "1rem auto" }}>
            {engageTimer}
          </div>
          <Btn variant="gold" size="lg" onClick={handleEngageRespond}>⚔️ I'm Here!</Btn>
        </div>
      </Modal>

      <Modal open={notesModalOpen} onClose={() => setNotesModalOpen(false)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", color: "var(--accent-violet)" }}>✨ Notes Generated</div>
          <Btn variant="ghost" size="sm" onClick={() => setNotesModalOpen(false)}>✕</Btn>
        </div>
        <div style={{ fontSize: ".9rem", lineHeight: 1.7, color: "var(--text-secondary)", maxHeight: 400, overflowY: "auto" }} dangerouslySetInnerHTML={{ __html: notes }} />
        <div style={{ display: "flex", gap: ".75rem", marginTop: "1rem" }}>
          <Btn variant="gold" onClick={() => { const blob = new Blob([notes.replace(/<[^>]*>/g,"")],{type:"text/plain"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="notes.txt"; a.click(); push("📥 Downloaded!","success"); }}>⬇ Download</Btn>
          <Btn variant="ghost" onClick={() => setNotesModalOpen(false)}>Close</Btn>
        </div>
      </Modal>

      <Modal open={victoryOpen} maxWidth={480}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "4rem" }}>{bossHP <= 0 ? "🏆" : "⭐"}</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--accent-gold)", marginTop: ".5rem" }}>{bossHP <= 0 ? "Boss Defeated!" : "Session Complete!"}</div>
          <p style={{ color: "var(--text-muted)", margin: "1rem 0" }}>{bossHP <= 0 ? `Your squad slew the ${BOSS_NAMES[room?.boss]}!` : "Great focus session, warrior!"}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem", justifyContent: "center", margin: "1rem 0" }}>
            {[["⚡",`+${xpReward} XP`],["🪙",`+${coinsReward} Coins`],["⚔️",`${Math.floor(totalDamage)} Damage`]].map(([icon,label]) => (
              <div key={label} style={{ display:"flex",alignItems:"center",gap:".4rem",background:"var(--bg-elevated)",border:"1px solid var(--border)",borderRadius:20,padding:".35rem .9rem",fontFamily:"var(--font-heading)",fontSize:".8rem" }}>
                <span>{icon}</span><span>{label}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: ".75rem", justifyContent: "center", marginTop: "1rem" }}>
            <Btn variant="ghost" onClick={() => { setVictoryOpen(false); onGoLobby(); }}>Return to Lobby</Btn>
            <Btn variant="gold" onClick={() => { setVictoryOpen(false); setQuizOpen(true); }}>📝 Final Quiz</Btn>
          </div>
        </div>
      </Modal>

      <Modal open={defeatOpen} maxWidth={420}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "4rem" }}>💀</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--accent-red)", marginTop: ".5rem" }}>Defeated!</div>
          <p style={{ color: "var(--text-muted)", margin: "1rem 0" }}>Your squad was overwhelmed. Stay focused next time!</p>
          <div style={{ display: "flex", gap: ".75rem", justifyContent: "center" }}>
            <Btn variant="ghost" onClick={() => { setDefeatOpen(false); onGoLobby(); }}>Retreat</Btn>
            <Btn variant="danger" onClick={() => setDefeatOpen(false)}>⚔️ Retry</Btn>
          </div>
        </div>
      </Modal>

      {quizOpen && (
        <QuizModal onClose={() => setQuizOpen(false)} onComplete={(result) => {
          setQuizOpen(false); setQuizComplete(result);
          addXP(result.correct * 15);
          onUpdatePlayer((p) => ({ ...p, coins: p.coins + result.correct * 5 }));
        }} />
      )}

      {quizComplete && (
        <Modal open={true} maxWidth={420}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "3.5rem" }}>{quizComplete.passed ? "🎓" : "📚"}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", marginTop: ".5rem", color: quizComplete.passed ? "var(--accent-gold)" : "var(--accent-violet)" }}>
              {quizComplete.passed ? "Knowledge Mastered!" : "Keep Studying!"}
            </div>
            <p style={{ color: "var(--text-muted)", margin: "1rem 0" }}>{quizComplete.correct}/{QUIZ_QUESTIONS.length} correct.</p>
            <div style={{ display: "flex", gap: ".5rem", justifyContent: "center", flexWrap: "wrap", margin: "1rem 0" }}>
              <div style={{ background:"var(--bg-elevated)",border:"1px solid var(--border)",borderRadius:20,padding:".35rem .9rem",fontFamily:"var(--font-heading)",fontSize:".8rem" }}>⚡ +{quizComplete.correct * 15} XP</div>
              <div style={{ background:"var(--bg-elevated)",border:"1px solid var(--border)",borderRadius:20,padding:".35rem .9rem",fontFamily:"var(--font-heading)",fontSize:".8rem" }}>🪙 +{quizComplete.correct * 5} Coins</div>
            </div>
            <Btn variant="gold" onClick={() => { setQuizComplete(null); onGoLobby(); }}>Claim & Return</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}