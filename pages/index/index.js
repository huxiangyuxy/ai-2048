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
    won: false
  },

  onLoad() {
    slideAudio = wx.createInnerAudioContext()
    slideAudio.src = '/assets/sound/slide.wav'
    slideAudio.volume = 0.6

    mergeAudio = wx.createInnerAudioContext()
    mergeAudio.src = '/assets/sound/merge.wav'
    mergeAudio.volume = 0.8

    this.restart()
  },

  restart() {
    const grid = this.createGrid()
    this.addRandom(grid)
    this.addRandom(grid)
    this.setData({
      grid,
      score: 0,
      canUndo: false,
      history: null,
      won: false
    })
  },

  /* 游戏结束 */
  isGameOver(grid) {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (!grid[i][j].value) return false
        if (j < 3 && grid[i][j].value === grid[i][j + 1].value) return false
        if (i < 3 && grid[i][j].value === grid[i + 1][j].value) return false
      }
    }
    return true
  },

  createGrid() {
    return Array.from({ length: SIZE }, (_, r) =>
      Array.from({ length: SIZE }, (_, c) => ({
        value: 0,
        r, c,
        dx: 0,
        dy: 0,
        merged: false
      }))
    )
  },

  cloneGrid(grid) {
    return grid.map(row => row.map(c => ({ ...c })))
  },

  addRandom(grid) {
    const empty = []
    grid.forEach((r, i) =>
      r.forEach((c, j) => {
        if (!c.value) empty.push([i, j])
      })
    )
    if (!empty.length) return
    const [r, c] = empty[Math.floor(Math.random() * empty.length)]
    grid[r][c].value = Math.random() < 0.9 ? 2 : 4
  },

  touchStart(e) {
    const t = e.touches[0]
    this.setData({ startX: t.clientX, startY: t.clientY })
  },

  touchEnd(e) {
    const t = e.changedTouches[0]
    const dx = t.clientX - this.data.startX
    const dy = t.clientY - this.data.startY
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return
    Math.abs(dx) > Math.abs(dy)
      ? dx > 0 ? this.move('right') : this.move('left')
      : dy > 0 ? this.move('down') : this.move('up')
  },

  move(dir) {
    let grid = this.cloneGrid(this.data.grid)
    let score = this.data.score
    let moved = false
    const old = this.cloneGrid(this.data.grid)

    const slide = arr => {
      arr = arr.filter(c => c.value)
      for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i].value === arr[i + 1].value) {
          arr[i].value *= 2
          arr[i].merged = true
          score += arr[i].value
          arr.splice(i + 1, 1)
        }
      }
      while (arr.length < SIZE) arr.push({ value: 0 })
      return arr
    }

    const operate = getter => {
      for (let i = 0; i < SIZE; i++) {
        const line = getter(i)
        const values = line.map(c => c.value)
        const merged = slide(line)
        merged.forEach((c, j) => {
          if (c.value !== values[j]) moved = true
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

    this.setData({ history: old, canUndo: true })
    this.addRandom(grid)

    if (grid.flat().some(c => c.merged)) {
      mergeAudio.stop()
      mergeAudio.play()
    }

    if (!this.data.won && grid.flat().some(c => c.value === 2048)) {
      this.setData({ won: true })
      wx.showModal({ title: '🎉 恭喜', content: '你已合成 2048！' })
    }

    this.setData({
      grid,
      score,
      bestScore: Math.max(score, this.data.bestScore)
    })
  },

  undo() {
    if (!this.data.canUndo) return
    this.setData({ grid: this.data.history, canUndo: false })
  }
})
