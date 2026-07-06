import { useEffect, useMemo, useRef, useState } from "react";

const STAGE_SIZE = 340;
const FACE_SIZE = 512;

const initialCrop = { x: 0, y: 0, scale: 1.08 };

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function App() {
  const [screen, setScreen] = useState("home");
  const [gameType, setGameType] = useState("jump");
  const [photoUrl, setPhotoUrl] = useState("");
  const [faceUrl, setFaceUrl] = useState("");
  const [crop, setCrop] = useState(initialCrop);

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  const handlePhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(URL.createObjectURL(file));
    setFaceUrl("");
    setCrop(initialCrop);
    setScreen("crop");
    event.target.value = "";
  };

  const startWithFace = (nextFaceUrl) => {
    setFaceUrl(nextFaceUrl);
    setScreen("game");
  };

  const resetPhoto = () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl("");
    setFaceUrl("");
    setCrop(initialCrop);
    setScreen("home");
  };

  return (
    <main className={`app app-${screen}`}>
      {screen === "home" && (
        <HomeScreen
          gameType={gameType}
          setGameType={setGameType}
          onPhoto={handlePhoto}
        />
      )}

      {screen === "crop" && photoUrl && (
        <CropScreen
          photoUrl={photoUrl}
          crop={crop}
          setCrop={setCrop}
          onBack={resetPhoto}
          onDone={startWithFace}
        />
      )}

      {screen === "game" && faceUrl && (
        <GameScreen
          faceUrl={faceUrl}
          gameType={gameType}
          setGameType={setGameType}
          onRetake={resetPhoto}
        />
      )}
    </main>
  );
}

function HomeScreen({ gameType, setGameType, onPhoto }) {
  return (
    <section className="home-screen" aria-label="トップ画面">
      <div className="hero-art" aria-hidden="true">
        <span className="sun" />
        <span className="cloud cloud-a" />
        <span className="cloud cloud-b" />
        <span className="hill hill-a" />
        <span className="hill hill-b" />
      </div>
      <div className="home-content">
        <p className="mini-label">ブラウザだけであそぶ</p>
        <h1>かおジャンプ</h1>
        <div className="game-picks" role="group" aria-label="ゲームを選ぶ">
          <button
            className={gameType === "jump" ? "pick active" : "pick"}
            type="button"
            onClick={() => setGameType("jump")}
          >
            ジャンプ
          </button>
          <button
            className={gameType === "shooter" ? "pick active" : "pick"}
            type="button"
            onClick={() => setGameType("shooter")}
          >
            シュート
          </button>
        </div>
        <label className="primary-file">
          写真を選ぶ
          <input type="file" accept="image/*" onChange={onPhoto} />
        </label>
        <p className="privacy-note">写真は保存されません。ブラウザ内だけで使用します。</p>
      </div>
    </section>
  );
}

function CropScreen({ photoUrl, crop, setCrop, onBack, onDone }) {
  const stageRef = useRef(null);
  const imageRef = useRef(null);
  const dragRef = useRef(null);
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 });
  const [stageSize, setStageSize] = useState(STAGE_SIZE);

  useEffect(() => {
    let cancelled = false;
    loadImage(photoUrl).then((image) => {
      if (cancelled) return;
      imageRef.current = image;
      setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
    });
    return () => {
      cancelled = true;
    };
  }, [photoUrl]);

  useEffect(() => {
    if (!stageRef.current) return undefined;
    const updateSize = () => {
      setStageSize(stageRef.current.getBoundingClientRect().width || STAGE_SIZE);
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, []);

  const fitScale = Math.max(stageSize / imageSize.width, stageSize / imageSize.height);
  const displayWidth = imageSize.width * fitScale * crop.scale;
  const displayHeight = imageSize.height * fitScale * crop.scale;
  const imageLeft = stageSize / 2 - displayWidth / 2 + crop.x;
  const imageTop = stageSize / 2 - displayHeight / 2 + crop.y;

  const beginDrag = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      cropX: crop.x,
      cropY: crop.y,
    };
  };

  const moveDrag = (event) => {
    if (!dragRef.current) return;
    const nextX = dragRef.current.cropX + event.clientX - dragRef.current.startX;
    const nextY = dragRef.current.cropY + event.clientY - dragRef.current.startY;
    setCrop((current) => ({ ...current, x: nextX, y: nextY }));
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const createFace = () => {
    const image = imageRef.current;
    if (!image) return;

    const canvas = document.createElement("canvas");
    canvas.width = FACE_SIZE;
    canvas.height = FACE_SIZE;
    const context = canvas.getContext("2d");
    const radius = stageSize * 0.39;
    const sourceScale = fitScale * crop.scale;
    const sourceX = (stageSize / 2 - radius - imageLeft) / sourceScale;
    const sourceY = (stageSize / 2 - radius - imageTop) / sourceScale;
    const sourceSize = (radius * 2) / sourceScale;

    context.clearRect(0, 0, FACE_SIZE, FACE_SIZE);
    context.save();
    context.beginPath();
    context.arc(FACE_SIZE / 2, FACE_SIZE / 2, FACE_SIZE / 2 - 4, 0, Math.PI * 2);
    context.clip();
    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, FACE_SIZE, FACE_SIZE);
    context.restore();
    context.lineWidth = 18;
    context.strokeStyle = "#ffffff";
    context.beginPath();
    context.arc(FACE_SIZE / 2, FACE_SIZE / 2, FACE_SIZE / 2 - 9, 0, Math.PI * 2);
    context.stroke();

    onDone(canvas.toDataURL("image/png"));
  };

  return (
    <section className="crop-screen" aria-label="顔調整画面">
      <div className="top-bar">
        <button className="ghost-button" type="button" onClick={onBack}>
          戻る
        </button>
        <strong>かおをあわせる</strong>
      </div>
      <div
        ref={stageRef}
        className="crop-stage"
        style={{ "--stage": `${STAGE_SIZE}px` }}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <img
          alt=""
          draggable="false"
          src={photoUrl}
          style={{
            width: `${displayWidth}px`,
            height: `${displayHeight}px`,
            left: `${imageLeft}px`,
            top: `${imageTop}px`,
          }}
        />
        <span className="crop-mask" />
        <span className="crop-ring" />
      </div>
      <div className="crop-controls">
        <label>
          おおきさ
          <input
            type="range"
            min="0.75"
            max="2.2"
            step="0.01"
            value={crop.scale}
            onChange={(event) =>
              setCrop((current) => ({ ...current, scale: Number(event.target.value) }))
            }
          />
        </label>
        <div className="move-grid" aria-label="位置調整">
          <button type="button" onClick={() => setCrop((c) => ({ ...c, y: c.y - 14 }))}>
            上
          </button>
          <button type="button" onClick={() => setCrop((c) => ({ ...c, x: c.x - 14 }))}>
            左
          </button>
          <button type="button" onClick={() => setCrop((c) => ({ ...c, x: c.x + 14 }))}>
            右
          </button>
          <button type="button" onClick={() => setCrop((c) => ({ ...c, y: c.y + 14 }))}>
            下
          </button>
        </div>
        <button className="primary-button" type="button" onClick={createFace}>
          この顔で遊ぶ
        </button>
      </div>
    </section>
  );
}

function GameScreen({ faceUrl, gameType, setGameType, onRetake }) {
  const [runId, setRunId] = useState(0);

  return (
    <section className="game-screen" aria-label="ゲーム画面">
      <div className="game-header">
        <button className="ghost-button" type="button" onClick={onRetake}>
          写真
        </button>
        <div className="mini-switch" role="group" aria-label="ゲーム切替">
          <button
            className={gameType === "jump" ? "active" : ""}
            type="button"
            onClick={() => {
              setGameType("jump");
              setRunId((id) => id + 1);
            }}
          >
            ジャンプ
          </button>
          <button
            className={gameType === "shooter" ? "active" : ""}
            type="button"
            onClick={() => {
              setGameType("shooter");
              setRunId((id) => id + 1);
            }}
          >
            シュート
          </button>
        </div>
      </div>
      <CanvasGame
        key={`${gameType}-${runId}`}
        faceUrl={faceUrl}
        gameType={gameType}
        onRestart={() => setRunId((id) => id + 1)}
      />
    </section>
  );
}

function CanvasGame({ faceUrl, gameType, onRestart }) {
  const canvasRef = useRef(null);
  const [status, setStatus] = useState({ score: 0, over: false });
  const faceImage = useMemo(() => {
    const image = new Image();
    image.src = faceUrl;
    return image;
  }, [faceUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    let animationFrame = 0;
    let lastTime = performance.now();
    let score = 0;
    let gameOver = false;
    let spawnTimer = 0;
    let shotTimer = 0;

    const state =
      gameType === "jump"
        ? createJumpState(canvas)
        : createShooterState(canvas);

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      const width = Math.min(430, Math.max(300, rect.width));
      const height = Math.min(690, Math.max(460, window.innerHeight - 150));
      const ratio = window.devicePixelRatio || 1;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      state.width = width;
      state.height = height;
      state.ground = height - 82;
      state.player.y = Math.min(state.player.y, state.ground - state.player.size);
    };

    const tap = () => {
      if (gameOver) return;
      if (gameType === "jump") {
        const player = state.player;
        if (player.onGround || player.jumpGrace > 0) {
          player.vy = -760;
          player.onGround = false;
          player.jumpGrace = 0;
        }
      } else {
        state.player.vy = -390;
        state.projectiles.push({
          x: state.player.x + state.player.size * 0.8,
          y: state.player.y + state.player.size * 0.35,
          r: 8,
          vx: 560,
        });
      }
    };

    const finish = () => {
      gameOver = true;
      setStatus({ score: Math.floor(score), over: true });
    };

    const loop = (time) => {
      const dt = Math.min(0.033, (time - lastTime) / 1000);
      lastTime = time;

      drawBackground(context, state.width, state.height, state.t);
      if (!gameOver) {
        state.t += dt;
        score += dt * (gameType === "jump" ? 12 : 18);
        spawnTimer -= dt;
        shotTimer -= dt;

        if (gameType === "jump") {
          updateJump(state, dt, spawnTimer <= 0);
          if (spawnTimer <= 0) spawnTimer = 1.05 + Math.random() * 0.75;
          if (hitsObstacle(state.player, state.obstacles)) finish();
        } else {
          updateShooter(state, dt, spawnTimer <= 0, shotTimer <= 0);
          if (spawnTimer <= 0) spawnTimer = 0.9 + Math.random() * 0.7;
          if (shotTimer <= 0) shotTimer = 0.42;
          if (hitsShooterThreat(state)) finish();
          score += state.popCount * 10;
          state.popCount = 0;
        }

        setStatus((current) => {
          const nextScore = Math.floor(score);
          return current.score === nextScore && !current.over
            ? current
            : { score: nextScore, over: false };
        });
      }

      if (gameType === "jump") {
        drawJumpWorld(context, state, faceImage);
      } else {
        drawShooterWorld(context, state, faceImage);
      }

      animationFrame = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener("resize", resize);
    canvas.addEventListener("pointerdown", tap);
    animationFrame = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", tap);
      cancelAnimationFrame(animationFrame);
    };
  }, [faceImage, gameType]);

  return (
    <div className="canvas-wrap">
      <canvas ref={canvasRef} aria-label="ゲームキャンバス" />
      <div className="score-pill">スコア {status.score}</div>
      {!status.over && <div className="tap-hint">タップ</div>}
      {status.over && (
        <div className="game-over">
          <h2>おしまい</h2>
          <p>スコア {status.score}</p>
          <button className="primary-button" type="button" onClick={onRestart}>
            もう一度遊ぶ
          </button>
        </div>
      )}
    </div>
  );
}

function createJumpState(canvas) {
  return {
    width: canvas.clientWidth || 360,
    height: canvas.clientHeight || 560,
    ground: 478,
    t: 0,
    obstacles: [],
    player: { x: 74, y: 320, size: 74, vy: 0, onGround: false, jumpGrace: 0 },
  };
}

function createShooterState(canvas) {
  return {
    width: canvas.clientWidth || 360,
    height: canvas.clientHeight || 560,
    ground: 478,
    t: 0,
    obstacles: [],
    projectiles: [],
    popCount: 0,
    player: { x: 64, y: 260, size: 68, vy: 0 },
  };
}

function updateJump(state, dt, shouldSpawn) {
  const player = state.player;
  player.vy += 2100 * dt;
  player.y += player.vy * dt;
  player.jumpGrace = Math.max(0, player.jumpGrace - dt);

  if (player.y + player.size >= state.ground) {
    player.y = state.ground - player.size;
    player.vy = 0;
    player.onGround = true;
    player.jumpGrace = 0.12;
  } else {
    player.onGround = false;
  }

  if (shouldSpawn) {
    const height = 38 + Math.random() * 44;
    state.obstacles.push({
      x: state.width + 30,
      y: state.ground - height,
      w: 30 + Math.random() * 26,
      h: height,
      speed: 250 + Math.min(90, state.t * 6),
      color: Math.random() > 0.5 ? "#ff7a8a" : "#58c7f3",
    });
  }

  state.obstacles.forEach((obstacle) => {
    obstacle.x -= obstacle.speed * dt;
  });
  state.obstacles = state.obstacles.filter((obstacle) => obstacle.x + obstacle.w > -20);
}

function updateShooter(state, dt, shouldSpawn, shouldAutoShot) {
  const player = state.player;
  player.vy += 760 * dt;
  player.y += player.vy * dt;
  player.y = clamp(player.y, 24, state.height - player.size - 98);
  if (player.y <= 24 || player.y >= state.height - player.size - 98) player.vy *= -0.2;

  if (shouldAutoShot) {
    state.projectiles.push({
      x: player.x + player.size * 0.8,
      y: player.y + player.size * 0.35,
      r: 7,
      vx: 520,
    });
  }

  if (shouldSpawn) {
    const r = 18 + Math.random() * 16;
    state.obstacles.push({
      x: state.width + r,
      y: 72 + Math.random() * (state.height - 190),
      r,
      vx: 125 + Math.random() * 105,
      color: Math.random() > 0.5 ? "#ffbc42" : "#7bd88f",
    });
  }

  state.projectiles.forEach((shot) => {
    shot.x += shot.vx * dt;
  });
  state.obstacles.forEach((threat) => {
    threat.x -= threat.vx * dt;
  });

  state.projectiles.forEach((shot) => {
    state.obstacles.forEach((threat) => {
      if (!threat.hit && distance(shot.x, shot.y, threat.x, threat.y) < shot.r + threat.r) {
        threat.hit = true;
        shot.hit = true;
        state.popCount += 1;
      }
    });
  });

  state.projectiles = state.projectiles.filter((shot) => !shot.hit && shot.x < state.width + 40);
  state.obstacles = state.obstacles.filter((threat) => !threat.hit && threat.x + threat.r > -30);
}

function hitsObstacle(player, obstacles) {
  const pad = 14;
  return obstacles.some(
    (obstacle) =>
      player.x + pad < obstacle.x + obstacle.w &&
      player.x + player.size - pad > obstacle.x &&
      player.y + pad < obstacle.y + obstacle.h &&
      player.y + player.size - pad > obstacle.y
  );
}

function hitsShooterThreat(state) {
  const player = state.player;
  const cx = player.x + player.size / 2;
  const cy = player.y + player.size / 2;
  return state.obstacles.some((threat) => distance(cx, cy, threat.x, threat.y) < player.size * 0.38 + threat.r);
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function drawBackground(context, width, height, t) {
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#a7e8ff");
  sky.addColorStop(0.62, "#effbff");
  sky.addColorStop(1, "#fff6d5");
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "#fff7a8";
  context.beginPath();
  context.arc(width - 64, 72, 34, 0, Math.PI * 2);
  context.fill();

  for (let i = 0; i < 5; i += 1) {
    const x = ((i * 130 - (t * 38) % 130) % (width + 150)) - 70;
    const y = 86 + (i % 3) * 52;
    drawCloud(context, x, y, 0.78 + (i % 2) * 0.18);
  }
}

function drawCloud(context, x, y, scale) {
  context.fillStyle = "rgba(255,255,255,0.86)";
  context.beginPath();
  context.arc(x, y + 18 * scale, 18 * scale, 0, Math.PI * 2);
  context.arc(x + 22 * scale, y + 9 * scale, 24 * scale, 0, Math.PI * 2);
  context.arc(x + 50 * scale, y + 19 * scale, 17 * scale, 0, Math.PI * 2);
  context.rect(x, y + 18 * scale, 54 * scale, 18 * scale);
  context.fill();
}

function drawJumpWorld(context, state, faceImage) {
  const { width, height, ground, player } = state;
  context.fillStyle = "#6fd46f";
  context.fillRect(0, ground, width, height - ground);
  context.fillStyle = "#45b462";
  for (let x = -20; x < width + 40; x += 42) {
    context.beginPath();
    context.arc(x + ((state.t * 180) % 42), ground + 2, 22, Math.PI, 0);
    context.fill();
  }

  state.obstacles.forEach((obstacle) => {
    context.fillStyle = obstacle.color;
    roundRect(context, obstacle.x, obstacle.y, obstacle.w, obstacle.h, 10);
    context.fill();
    context.fillStyle = "rgba(255,255,255,0.5)";
    roundRect(context, obstacle.x + 7, obstacle.y + 8, obstacle.w - 14, 8, 6);
    context.fill();
  });

  drawPlayer(context, faceImage, player.x, player.y, player.size, "#ffcb4f");
}

function drawShooterWorld(context, state, faceImage) {
  const { player } = state;
  context.fillStyle = "rgba(255, 248, 207, 0.9)";
  for (let i = 0; i < 26; i += 1) {
    const x = (i * 47 - (state.t * 120) % 47 + state.width) % state.width;
    const y = 46 + ((i * 83) % (state.height - 160));
    context.beginPath();
    context.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
    context.fill();
  }

  state.projectiles.forEach((shot) => {
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(shot.x, shot.y, shot.r, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#ffb238";
    context.lineWidth = 4;
    context.stroke();
  });

  state.obstacles.forEach((threat) => {
    context.fillStyle = threat.color;
    context.beginPath();
    context.arc(threat.x, threat.y, threat.r, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(255,255,255,0.45)";
    context.beginPath();
    context.arc(threat.x - threat.r * 0.25, threat.y - threat.r * 0.28, threat.r * 0.28, 0, Math.PI * 2);
    context.fill();
  });

  context.fillStyle = "#ff83a5";
  context.beginPath();
  context.moveTo(player.x + 8, player.y + player.size * 0.5);
  context.lineTo(player.x - 24, player.y + player.size * 0.18);
  context.lineTo(player.x - 20, player.y + player.size * 0.82);
  context.closePath();
  context.fill();
  drawPlayer(context, faceImage, player.x, player.y, player.size, "#7ad9ff");
}

function drawPlayer(context, faceImage, x, y, size, bodyColor) {
  context.fillStyle = bodyColor;
  context.beginPath();
  context.ellipse(x + size / 2, y + size * 0.72, size * 0.45, size * 0.34, 0, 0, Math.PI * 2);
  context.fill();

  context.save();
  context.beginPath();
  context.arc(x + size / 2, y + size * 0.43, size * 0.42, 0, Math.PI * 2);
  context.clip();
  if (faceImage.complete) {
    context.drawImage(faceImage, x + size * 0.08, y + size * 0.01, size * 0.84, size * 0.84);
  } else {
    context.fillStyle = "#ffffff";
    context.fillRect(x, y, size, size);
  }
  context.restore();

  context.strokeStyle = "#ffffff";
  context.lineWidth = 5;
  context.beginPath();
  context.arc(x + size / 2, y + size * 0.43, size * 0.42, 0, Math.PI * 2);
  context.stroke();
}

function roundRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

export default App;
