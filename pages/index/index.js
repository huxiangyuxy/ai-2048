const SIZE = 4
let slideAudio, mergeAudio

Page({
  data: {
    grid: [],
    score: 0,
    bestScore: 0,

    startX: 0,
    startY: 0,

    canUndo: false,
    history: null,

    hasWon: false,
    winShown: false,
    gameOver: false
  },

  onLoad() {
    slideAudio = wx.createInnerAudioContext()
    slideAudio.src = '/assets/sound/slide.mp3'
    slideAudio.volume = 0.6

    mergeAudio = wx.createInnerAudioContext()
    mergeAudio.src = '/assets/sound/merge.mp3'
    mergeAudio.volume = 0.8

    this.restart()
  },

  /* ================= 初始化 ================= */
  restart() {
    const grid = this.createGrid()
    this.addRandom(grid)
    this.addRandom(grid)

    this.setData({
      grid,
      score: 0,
      canUndo: false,
      history: null,
      hasWon: false,
      winShown: false,
      gameOver: false
    })
  },

  createGrid() {
    return Array.from({ length: SIZE }, (_, r) =>
      Array.from({ length: SIZE }, (_, c) => ({
        value: 0,
        r,
        c,
        merged: false
      }))
    )
  },

  cloneGrid(grid) {
    return grid.map(row =>
      row.map(cell => ({ ...cell }))
    )
  },

  addRandom(grid) {
    const empty = []
    grid.forEach((row, i) =>
      row.forEach((c, j) => {
        if (c.value === 0) empty.push([i, j])
      })
    )
    if (!empty.length) return
    const [r, c] = empty[Math.floor(Math.random() * empty.length)]
    grid[r][c].value = Math.random() < 0.9 ? 2 : 4
  },

  /* ================= 触摸 ================= */
  touchStart(e) {
    if (this.data.gameOver) return
    const t = e.touches[0]
    this.setData({ startX: t.clientX, startY: t.clientY })
  },

  touchEnd(e) {
    if (this.data.gameOver) return
    const t = e.changedTouches[0]
    const dx = t.clientX - this.data.startX
    const dy = t.clientY - this.data.startY
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return

    Math.abs(dx) > Math.abs(dy)
      ? dx > 0 ? this.move('right') : this.move('left')
      : dy > 0 ? this.move('down') : this.move('up')
  },

  /* ================= 移动核心 ================= */
  move(dir) {
    if (this.data.gameOver) return

    let grid = this.cloneGrid(this.data.grid)
    let score = this.data.score
    let moved = false

    const history = {
      grid: this.cloneGrid(this.data.grid),
      score: this.data.score
    }

    // 清空 merged 状态
    grid.flat().forEach(c => c.merged = false)

    const slide = arr => {
      arr = arr.filter(c => c.value)
      for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i].value === arr[i + 1].value) {
          arr[i].value *= 2
          arr[i].merged = true
          score += arr[i].value

          if (arr[i].value === 2048 && !this.data.hasWon) {
            this.setData({ hasWon: true })
          }

          arr.splice(i + 1, 1)
        }
      }
      while (arr.length < SIZE) arr.push({ value: 0, merged: false })
      return arr
    }

    const operate = getter => {
      for (let i = 0; i < SIZE; i++) {
        const line = getter(i)
        const before = line.map(c => c.value)
        const after = slide(line)

        after.forEach((c, j) => {
          if (before[j] !== c.value) moved = true
          line[j].value = c.value
          line[j].merged = c.merged
        })
      }
    }

    if (dir === 'left') operate(i => grid[i])
    if (dir === 'right') operate(i => grid[i].slice().reverse())
    if (dir === 'up') operate(i => grid.map(r => r[i]))
    if (dir === 'down') operate(i => grid.map(r => r[i]).reverse())

    if (!moved) return

    slideAudio.stop()
    slideAudio.play()

    this.addRandom(grid)

    if (grid.flat().some(c => c.merged)) {
      mergeAudio.stop()
      mergeAudio.play()
    }

    this.setData({
      grid,
      score,
      bestScore: Math.max(score, this.data.bestScore),
      history,
      canUndo: true
    })

    /* ===== 胜利 ===== */
    if (this.data.hasWon && !this.data.winShown) {
      this.setData({ winShown: true })
      wx.showModal({
        title: '🎉 胜利',
        content: '你成功合成了 2048！',
        confirmText: '重新开始',
        cancelText: '继续游戏',
        success: res => {
          if (res.confirm) this.restart()
        }
      })
      return
    }

    /* ===== 游戏结束 ===== */
    if (this.isGameOver(grid)) {
      this.setData({ gameOver: true })
      wx.showModal({
        title: '😢 游戏结束',
        content: '已经无法移动了',
        confirmText: '重新开始',
        showCancel: false,
        success: () => this.restart()
      })
    }
  },

  /* ================= 结束判断 ================= */
  isGameOver(grid) {
    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE; j++) {
        const v = grid[i][j].value
        if (v === 0) return false
        if (j < SIZE - 1 && v === grid[i][j + 1].value) return false
        if (i < SIZE - 1 && v === grid[i + 1][j].value) return false
      }
    }
    return true
  },

  /* ================= 回退 ================= */
  undo() {
    if (!this.data.canUndo || this.data.gameOver) return
    this.setData({
      grid: this.data.history.grid,
      score: this.data.history.score,
      canUndo: false
    })
  }
})
