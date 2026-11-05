# 状态规范（State Spec）· 小图鉴 Pico Atlas

所有需要跨启动记住的东西，都在这里。

---

## 1. 存储键

| 环境 | 键名 |
| --- | --- |
| `localStorage`（原型） | `pico-atlas` |
| App | `pico_atlas_state` |

**大版本号 `v` 必须存在。** 结构变更时按版本迁移，不直接丢弃。

---

## 2. 完整结构

```json
{
  "v": 1,
  "ageBand": "L1",

  "progress": {
    "look": { "lastId": "cat",  "seen": ["apple", "banana", "orange", "cat"] },
    "read": { "lastId": "jingyesi", "seen": ["yonge", "jingyesi"] },
    "play": { "lastId": "count-3", "seen": ["count-1", "count-2", "count-3"] }
  },

  "prefs": {
    "autoPlay": false
  },

  "stats": {
    "totalSeconds": 7680,
    "lastOpenAt": "2026-11-05T20:12:00.000Z"
  }
}
```

### 字段说明

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `v` | number | 结构版本 |
| `ageBand` | `L1` \| `L2` \| `L3` | 年龄档。决定卡片呈现深度 |
| `progress.{lane}.lastId` | string | 该入口最后停留的卡片 id |
| `progress.{lane}.seen` | string[] | 已看过的卡片 id |
| `prefs.autoPlay` | boolean | 上次是否用连读 |
| `stats.totalSeconds` | number | 累计使用秒数 |
| `stats.lastOpenAt` | ISO string | 上次打开时间 |

`lane` 取值固定三个：`look`（认东西）、`read`（读一读）、`play`（玩一玩）。

**三个入口各记各的，互不覆盖。**

---

## 3. 铁律：记 id，不记序号

```
❌ { "index": 36 }        // 以后插入 5 个蔬菜，就错位了
✅ { "lastId": "cat" }    // 无论怎么增删，永远回到小猫
```

### 恢复算法

```
1. 取 lastId
2. 在当前列表 findIndex(card => card.id === lastId)
3. 找到 → 定位到该位置
4. 找不到 → 退回到 0（该入口开头），不报错、不白屏
5. lastId 为空 → 从 0 开始
```

**第 4 步很重要。** 删掉一条内容不能让用户看到错误页。

---

## 4. 写入时机

| 时机 | 写入内容 |
| --- | --- |
| 首页长按/点击年龄标签改档 | `ageBand` |
| 翻页停下后 | `progress.{lane}.lastId` |
| 卡片已展示 ≥ 2 秒 | 加入 `progress.{lane}.seen` |
| 点 ▶ 连读 | `prefs.autoPlay = true` |
| 点卡片单读 | `prefs.autoPlay = false` |
| 离开页面（`pagehide` / `visibilitychange`） | `stats.totalSeconds`、`lastOpenAt` |

**不要每次操作都写。** 翻页是高频动作，用防抖（≥ 400ms）后写一次。

---

## 5. 首次启动

```
读 localStorage
 ├─ 无记录 → 显示年龄选择页（3 个大按钮）
 │           选完写入 ageBand，进入首页
 └─ 有记录 → 直接进入首页
```

**年龄页只在没有 `ageBand` 时出现。绝不能每次都问。**

---

## 6. 边界情况

| 情况 | 当前处理 |
| --- | --- |
| 两个孩子用同一台设备 | **不做多档案**。切年龄时进度保留，二宝从大宝停下的地方继续。加多档案就要加"选谁在用"的界面，会破坏纯儿童模式 |
| 清缓存 / 换设备 | 进度丢失，不恢复。（未来可做"进度的 6 位码"离线迁移） |
| 内容被删除（lastId 失效） | 退回到该入口开头 |
| localStorage 不可用（隐私模式） | 降级为内存态，功能正常但不记忆，不弹错误提示 |
| 数据结构升级 | 按 `v` 版本迁移；无迁移逻辑时重置 |
| 连读播到一半退出 | 下次从当前卡片继续，**不回到第 1 张** |

---

## 7. 不做的事

- ❌ 不上云、不同步
- ❌ 不需要账号
- ❌ 不采集任何个人信息
- ❌ 不做跨设备

儿童数据留在本机就够了，联网反而增加合规负担。

---

## 8. 验收清单

- [ ] 选完年龄后重启浏览器，直接进首页，不再问年龄
- [ ] 在「认东西」滑到第 20 张，退出，重进仍在第 20 张
- [ ] 在「读一读」滑到第 3 首，再回「认东西」，位置仍是第 20 张（互不覆盖）
- [ ] 手动删掉 `lastId` 对应的内容，重进不报错，从该入口开头开始
- [ ] 连读播到第 8 张时关闭，重进在第 8 张
- [ ] 隐私模式下所有功能可用，不弹错
