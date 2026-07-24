(function(){
  const CELL = 24;
 

  const MAZE_TEMPLATE = [
"###################",
"#.................#",
"#.##.##.#.#.##.##.#",
"#o##.##.#.#.##.##o#",
"#.................#",
"#.#.#.#.#.#.#.#.#.#",
"#.................#",
"####.#.## ##.#.####",
"####.#.#HHH#.#.####",
"####.#.## ##.#.####",
"                   ",
"####.#.## ##.#.####",
"####.#.#HHH#.#.####",
"####.#.## ##.#.####",
"#.................#",
"#.#.#.#.#.#.#.#.#.#",
"#........P........#",
"#.##.##.#.#.##.##.#",
"#o##.##.#.#.##.##o#",
"#.................#",
"###################",
  ];
 
  const ROWS = MAZE_TEMPLATE.length;
  const COLS = MAZE_TEMPLATE[0].length;
  const W = COLS*CELL, H = ROWS*CELL;
 
  const canvas = document.getElementById('game');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
 
  // Locate pac start and ghost-house spawn cells once, from the template,
  // BEFORE any dot-counting, so those special cells never get miscounted as dots.
  let PAC_START = null;
  const HOUSE_CELLS = [];
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      const ch = MAZE_TEMPLATE[r][c];
      if(ch === 'P') PAC_START = {c,r};
      if(ch === 'H') HOUSE_CELLS.push({c,r});
    }
  }
 
  const GHOST_SPAWNS = [
    {...HOUSE_CELLS[0], color:'#ff0000', name:'blinky'},
    {...HOUSE_CELLS[2], color:'#ffb8ff', name:'pinky'},
    {...HOUSE_CELLS[3], color:'#00ffff', name:'inky'},
    {...HOUSE_CELLS[5], color:'#ffb852', name:'clyde'},
  ];
 
  let grid, pac, ghosts, dotsLeft, score, lives, gameOver, win, powerTimer, tickCount;
 
  function freshGrid(){
    
    return MAZE_TEMPLATE.map(row => row.split('').map(ch => (ch === 'P' || ch === 'H') ? ' ' : ch));
  }
 
  function initGame(){
    grid = freshGrid();
    score = 0; lives = 3; gameOver = false; win = false; powerTimer = 0; tickCount = 0;
 
    dotsLeft = 0;
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
      if(grid[r][c] === '.' || grid[r][c] === 'o') dotsLeft++;
    }
 
    pac = { c: PAC_START.c, r: PAC_START.r, dir:{x:0,y:0}, next:{x:0,y:0}, mouth:0 };
 
    ghosts = GHOST_SPAWNS.map(g => ({
      c: g.c, r: g.r,
      dir: { x: (Math.random()<0.5 ? -1 : 1), y: 0 },
      color: g.color, name: g.name,
      scared: false,
      spawn: { c: g.c, r: g.r },
    }));
 
    updateHUD();
    document.getElementById('msg').style.display = 'none';
  }
 
  function updateHUD(){
    document.getElementById('score').textContent = score;
    document.getElementById('lives').textContent = 'LIVES: ' + '●'.repeat(Math.max(lives,0));
  }
 

  let queuedDir = {x:0,y:0};
  function setDir(x,y){ queuedDir = {x,y}; }
  window.addEventListener('keydown', (e)=>{
    switch(e.key){
      case 'ArrowUp': case 'w': case 'W': setDir(0,-1); e.preventDefault(); break;
      case 'ArrowDown': case 's': case 'S': setDir(0,1); e.preventDefault(); break;
      case 'ArrowLeft': case 'a': case 'A': setDir(-1,0); e.preventDefault(); break;
      case 'ArrowRight': case 'd': case 'D': setDir(1,0); e.preventDefault(); break;
      case 'r': case 'R': initGame(); break;
    }
  });
  document.getElementById('btnUp').onclick = ()=>setDir(0,-1);
  document.getElementById('btnDown').onclick = ()=>setDir(0,1);
  document.getElementById('btnLeft').onclick = ()=>setDir(-1,0);
  document.getElementById('btnRight').onclick = ()=>setDir(1,0);
  document.getElementById('restartBtn').onclick = initGame;
 
  function wrapC(c){ if(c<0) return COLS-1; if(c>=COLS) return 0; return c; }
  function canMove(c,r){
    if(r<0||r>=ROWS) return false;
    const cc = wrapC(c);
    return grid[r][cc] !== '#';
  }
 
  function step(){
    tickCount++;
 
    if(canMove(pac.c+queuedDir.x, pac.r+queuedDir.y)) pac.dir = queuedDir;
    if(canMove(pac.c+pac.dir.x, pac.r+pac.dir.y)){
      pac.c = wrapC(pac.c+pac.dir.x);
      pac.r += pac.dir.y;
    }
    pac.mouth = (pac.mouth+1) % 20;
 
    const cell = grid[pac.r][pac.c];
    if(cell === '.'){
      grid[pac.r][pac.c] = ' ';
      score += 10; dotsLeft--;
      updateHUD();
    } else if(cell === 'o'){
      grid[pac.r][pac.c] = ' ';
      score += 50; dotsLeft--;
      updateHUD();
      powerTimer = 300;
      ghosts.forEach(g => g.scared = true);
    }
 
    if(dotsLeft <= 0){
      win = true; gameOver = true;
      showMsg('YOU WIN!', 'Press R or tap restart to play again');
      return;
    }
 
    if(powerTimer > 0){
      powerTimer--;
      if(powerTimer === 0) ghosts.forEach(g => g.scared = false);
    }
 
    // Ghosts move slightly slower than Pac-Man (skip roughly 1 move in 6) for fairness.
    const ghostsMoveThisTick = (tickCount % 6 !== 0);
    if(ghostsMoveThisTick) ghosts.forEach(moveGhost);
 
    for(const g of ghosts){
      if(g.c === pac.c && g.r === pac.r){
        if(g.scared){
          score += 200;
          updateHUD();
          g.c = g.spawn.c; g.r = g.spawn.r; g.scared = false;
        } else {
          lives--;
          updateHUD();
          if(lives <= 0){
            gameOver = true;
            showMsg('GAME OVER', 'Press R or tap restart to try again');
            return;
          } else {
            resetPositions();
          }
          break;
        }
      }
    }
  }
 
  function resetPositions(){
    pac.c = PAC_START.c; pac.r = PAC_START.r; pac.dir = {x:0,y:0};
    queuedDir = {x:0,y:0};
    ghosts.forEach(g => { g.c = g.spawn.c; g.r = g.spawn.r; g.scared = false; });
    powerTimer = 0;
  }
 
  function validGhostDirs(g){
    const dirs = [{x:0,y:-1},{x:0,y:1},{x:-1,y:0},{x:1,y:0}];
    const forward = dirs.filter(d =>
      !(d.x === -g.dir.x && d.y === -g.dir.y) && canMove(g.c+d.x, g.r+d.y)
    );
    if(forward.length > 0) return forward;
    // Only reverse if every non-reverse option is blocked (dead end).
    return dirs.filter(d => canMove(g.c+d.x, g.r+d.y));
  }
 
  function moveGhost(g){
    const opts = validGhostDirs(g);
    if(opts.length > 0){
      let best = opts[0];
      let bestScore = g.scared ? -Infinity : Infinity;
      for(const d of opts){
        const nc = wrapC(g.c+d.x), nr = g.r+d.y;
        const dist = Math.hypot(nc-pac.c, nr-pac.r);
        if(g.scared){
          if(dist > bestScore){ bestScore = dist; best = d; }
        } else {
          const noisy = dist + Math.random()*2; // small noise so ghosts aren't perfect
          if(noisy < bestScore){ bestScore = noisy; best = d; }
        }
      }
      if(Math.random() < 0.08) best = opts[Math.floor(Math.random()*opts.length)];
      g.dir = best;
    }
    if(canMove(g.c+g.dir.x, g.r+g.dir.y)){
      g.c = wrapC(g.c+g.dir.x);
      g.r += g.dir.y;
    }
  }
 
  function showMsg(big, small){
    document.getElementById('msgBig').textContent = big;
    document.getElementById('msgSmall').textContent = small;
    document.getElementById('msg').style.display = 'flex';
  }
 
  function draw(){
    ctx.clearRect(0,0,W,H);
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        const ch = grid[r][c];
        const x = c*CELL, y = r*CELL;
        if(ch === '#'){
          ctx.fillStyle = '#0d0d3a';
          ctx.fillRect(x,y,CELL,CELL);
          ctx.strokeStyle = '#5454ff';
          ctx.lineWidth = 2;
          ctx.strokeRect(x+1,y+1,CELL-2,CELL-2);
        } else if(ch === '.'){
          ctx.fillStyle = '#ffb8ae';
          ctx.beginPath();
          ctx.arc(x+CELL/2, y+CELL/2, 3, 0, Math.PI*2);
          ctx.fill();
        } else if(ch === 'o'){
          ctx.fillStyle = '#ffcf6e';
          const pulse = 6 + Math.sin(tickCount/6)*1.5;
          ctx.beginPath();
          ctx.arc(x+CELL/2, y+CELL/2, pulse, 0, Math.PI*2);
          ctx.fill();
        }
      }
    }
    drawPac();
    ghosts.forEach(drawGhost);
  }
 
  function drawPac(){
    const x = pac.c*CELL + CELL/2;
    const y = pac.r*CELL + CELL/2;
    const r = CELL/2 - 1;
    let angle = 0;
    if(pac.dir.x === 1) angle = 0;
    else if(pac.dir.x === -1) angle = Math.PI;
    else if(pac.dir.y === -1) angle = -Math.PI/2;
    else if(pac.dir.y === 1) angle = Math.PI/2;
 
    const mouthOpen = Math.abs(10-pac.mouth)/10 * 0.28*Math.PI + 0.03;
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(angle);
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.arc(0,0,r, mouthOpen, Math.PI*2-mouthOpen);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
 
  function drawGhost(g){
    const x = g.c*CELL + CELL/2;
    const y = g.r*CELL + CELL/2;
    const r = CELL/2 - 1;
    const flashing = g.scared && powerTimer < 60 && Math.floor(powerTimer/10) % 2 === 0;
    ctx.fillStyle = g.scared ? (flashing ? '#ffffff' : '#2222ff') : g.color;
 
    // body: dome top + scalloped bottom (4 rounded "feet")
    ctx.beginPath();
    ctx.arc(x, y, r, Math.PI, 0); // dome
    ctx.lineTo(x+r, y+r);
    const feet = 4, footW = (r*2)/feet;
    for(let i=0;i<feet;i++){
      const fx0 = x+r - i*footW;
      const fx1 = fx0 - footW/2;
      const fx2 = fx0 - footW;
      ctx.quadraticCurveTo(fx1, y+r-6, fx2, y+r);
    }
    ctx.closePath();
    ctx.fill();
 
    // eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x-4, y-2, 3.2, 0, Math.PI*2);
    ctx.arc(x+4, y-2, 3.2, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = g.scared ? '#2222ff' : '#00008b';
    const ex = g.dir.x*1.5, ey = g.dir.y*1.5;
    ctx.beginPath();
    ctx.arc(x-4+ex, y-2+ey, 1.5, 0, Math.PI*2);
    ctx.arc(x+4+ex, y-2+ey, 1.5, 0, Math.PI*2);
    ctx.fill();
  }
 
  let acc = 0, last = performance.now();
  const stepInterval = 1000/9; // ~9 moves/sec
  function loop(now){
    const dt = now-last; last = now;
    if(!gameOver){
      acc += dt;
      while(acc > stepInterval){
        step();
        acc -= stepInterval;
        if(gameOver) break;
      }
    }
    draw();
    requestAnimationFrame(loop);
  }
 
  initGame();
  requestAnimationFrame(loop);
})();
