<template>
  <v-app>
    <v-main>
      <v-container fluid>
        <!-- 多人游戏：连接/大厅 -->
        <template v-if="gameMode === 'multi'">
          <!-- 未连接：创建或加入房间 -->
          <v-card
            v-if="multi.phase.value === 'disconnected'"
            elevation="3"
            class="mb-4"
          >
            <v-card-title class="text-h6 font-weight-bold"
              >多人游戏</v-card-title
            >
            <v-divider />
            <v-card-text>
              <v-alert v-if="multi.error" type="info" class="mb-2">{{
                multi.error
              }}</v-alert>
              <v-btn
                v-if="canReconnect"
                color="primary"
                variant="tonal"
                class="mb-3"
                :loading="multi.connecting.value"
                @click="multi.reconnect()"
              >
                重新连接上局
              </v-btn>
              <div class="d-flex flex-column gap-4">
                <div>
                  <div class="text-subtitle-2 mb-2">创建房间</div>
                  <div class="d-flex align-center gap-2">
                    <v-text-field
                      v-model.number="multiMaxPlayers"
                      label="玩家人数（2-6）"
                      type="number"
                      min="2"
                      max="6"
                      density="compact"
                      variant="outlined"
                      hide-details
                      style="max-width: 120px"
                    />
                    <v-btn
                      color="primary"
                      :loading="multi.connecting.value"
                      @click="onMultiCreateRoom"
                    >
                      创建并加入
                    </v-btn>
                  </div>
                </div>
                <v-divider />
                <div>
                  <div class="text-subtitle-2 mb-2">加入房间</div>
                  <div class="d-flex align-center gap-2 flex-wrap">
                    <v-text-field
                      v-model="multiRoomIdInput"
                      label="房间 ID 或完整链接"
                      density="compact"
                      variant="outlined"
                      hide-details
                      placeholder="粘贴房主分享的链接"
                      style="max-width: 320px"
                      @paste="onMultiRoomIdPaste"
                    />
                    <v-btn
                      color="secondary"
                      variant="outlined"
                      :loading="multi.connecting.value"
                      :disabled="!multiRoomIdInput.trim()"
                      @click="onMultiJoinRoom"
                    >
                      加入
                    </v-btn>
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>

          <!-- 大厅：等待玩家、设置名称 -->
          <v-card
            v-else-if="multi.phase.value === 'lobby'"
            elevation="3"
            class="mb-4"
          >
            <v-card-title class="d-flex align-center justify-space-between">
              <span class="text-h6 font-weight-bold">游戏大厅</span>
              <v-chip v-if="multi.isHost.value" color="primary" size="small"
                >房主</v-chip
              >
            </v-card-title>
            <v-divider />
            <v-card-text>
              <v-alert type="info" variant="tonal" class="mb-3">
                分享链接给好友加入，人齐后房主可开启游戏：
              </v-alert>
              <div class="d-flex align-center gap-2 mb-4">
                <v-text-field
                  :model-value="multiShareLink"
                  readonly
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="flex-grow-1"
                />
                <v-btn
                  color="primary"
                  variant="tonal"
                  @click="copyMultiShareLink"
                >
                  复制链接
                </v-btn>
              </div>
              <div class="text-caption text-medium-emphasis mb-2">
                玩家（点击编辑自己的名称和颜色）
              </div>
              <div class="d-flex flex-wrap gap-2">
                <v-card
                  v-for="(slot, idx) in multi.lobbySlots.value.filter(
                    (s) => s.sessionId,
                  )"
                  :key="slot.sessionId"
                  variant="tonal"
                  :color="slot.color"
                  class="pa-3"
                  style="min-width: 160px"
                >
                  <div class="d-flex align-center mb-2">
                    <v-avatar size="28" :color="slot.color">
                      <span class="text-body-2 font-weight-bold">
                        {{ slot.name.trim().charAt(0) || idx + 1 }}
                      </span>
                    </v-avatar>
                    <span class="text-body-2 ml-2">
                      {{
                        slot.sessionId === multi.mySessionId.value
                          ? "我"
                          : `玩家${idx + 1}`
                      }}
                    </span>
                  </div>
                  <template v-if="slot.sessionId === multi.mySessionId.value">
                    <v-text-field
                      :model-value="myLobbyName"
                      label="我的名字"
                      density="compact"
                      variant="outlined"
                      hide-details
                      @update:model-value="onMyLobbyNameChange"
                    />
                    <div class="d-flex flex-wrap gap-1 mt-2">
                      <v-avatar
                        v-for="c in colorPresets"
                        :key="c"
                        size="24"
                        :color="c"
                        :class="
                          lobbyColorsTakenByOthers.has(c) && slot.color !== c
                            ? ''
                            : 'cursor-pointer'
                        "
                        :style="[
                          slot.color === c
                            ? 'outline: 2px solid rgba(var(--v-theme-primary), 0.8)'
                            : '',
                          lobbyColorsTakenByOthers.has(c) && slot.color !== c
                            ? 'opacity: 0.45; cursor: not-allowed'
                            : '',
                        ]"
                        @click="
                          lobbyColorsTakenByOthers.has(c) && slot.color !== c
                            ? undefined
                            : multi.send('setPlayerColor', { color: c })
                        "
                      >
                        <v-icon v-if="slot.color === c" size="14" color="white"
                          >mdi-check</v-icon
                        >
                      </v-avatar>
                    </div>
                  </template>
                  <template v-else>
                    <div class="text-body-2">{{ slot.name || "未设置" }}</div>
                  </template>
                </v-card>
              </div>
              <div class="d-flex gap-2 mt-4">
                <v-btn
                  v-if="multi.isHost.value"
                  color="primary"
                  size="large"
                  :disabled="
                    multi.lobbySlots.value.filter((s) => s.sessionId).length < 2
                  "
                  @click="multi.send('startGame')"
                >
                  开始游戏
                </v-btn>
                <v-btn
                  size="large"
                  variant="outlined"
                  @click="onMultiDisconnect"
                >
                  离开房间
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </template>

        <!-- 单人模式已移除 -->
        <v-card v-if="false" elevation="3" class="mb-4">
          <v-card-title class="d-flex align-center justify-space-between">
            <span class="text-h6 font-weight-bold">游戏设置</span>
            <v-chip size="small" color="primary" variant="flat">
              起始资金：¥{{ START_MONEY.toLocaleString() }}
            </v-chip>
          </v-card-title>
          <v-divider />
          <v-card-text>
            <v-alert type="info" variant="tonal" class="mb-4">
              设置玩家人数、名字和颜色后点击「开始游戏」，或「导入存档」从文件恢复进度。
            </v-alert>

            <input
              ref="importFileInputRef"
              type="file"
              accept=".json,application/json"
              class="d-none"
              @change="onImportFileChange"
            />
            <div class="d-flex flex-wrap gap-2 mb-4 align-center">
              <v-btn color="primary" @click="onStartGame">开始游戏</v-btn>
              <v-btn
                color="secondary"
                variant="outlined"
                @click="triggerImportFile"
              >
                导入存档
              </v-btn>
            </div>

            <v-text-field
              v-model.number="playerCount"
              label="玩家人数（2-6）"
              type="number"
              min="2"
              max="6"
              density="compact"
              variant="outlined"
              class="mb-3"
            />

            <div class="text-caption text-medium-emphasis mb-1">
              玩家信息（可点颜色修改）
            </div>
            <v-slide-y-transition group>
              <v-card
                v-for="(player, index) in editablePlayers"
                :key="player.id"
                class="mb-2"
                variant="tonal"
                :color="player.color"
              >
                <v-card-subtitle
                  class="py-1 d-flex align-center justify-space-between"
                >
                  <div class="d-flex align-center">
                    <v-avatar size="28" class="mr-2" :color="player.color">
                      <span class="text-body-2 font-weight-bold">
                        {{ player.name.trim().charAt(0) || index + 1 }}
                      </span>
                    </v-avatar>
                    <span class="text-body-2">玩家 {{ index + 1 }}</span>
                  </div>
                  <v-menu>
                    <template #activator="{ props }">
                      <v-btn
                        v-bind="props"
                        size="x-small"
                        icon="mdi-palette"
                        variant="text"
                      />
                    </template>
                    <v-card>
                      <v-card-text class="pa-2">
                        <v-item-group
                          v-model="player.color"
                          mandatory
                          @update:model-value="
                            (val: string) => (player.color = val)
                          "
                        >
                          <v-row dense>
                            <v-col
                              v-for="c in colorPresets"
                              :key="c"
                              cols="3"
                              class="d-flex justify-center"
                            >
                              <v-item
                                :value="c"
                                v-slot="{ isSelected, toggle }"
                              >
                                <v-avatar
                                  size="24"
                                  :color="c"
                                  class="cursor-pointer"
                                  @click="toggle"
                                >
                                  <v-icon
                                    v-if="isSelected"
                                    size="16"
                                    icon="mdi-check"
                                  />
                                </v-avatar>
                              </v-item>
                            </v-col>
                          </v-row>
                        </v-item-group>
                      </v-card-text>
                    </v-card>
                  </v-menu>
                </v-card-subtitle>
                <v-card-text class="pt-0">
                  <v-text-field
                    v-model="player.name"
                    :label="`玩家 ${index + 1} 名字`"
                    density="compact"
                    variant="outlined"
                    hide-details="auto"
                  />
                </v-card-text>
              </v-card>
            </v-slide-y-transition>
          </v-card-text>
        </v-card>

        <!-- 游戏进行中的界面 -->
        <div v-if="hasActiveGame">
          <v-row>
            <v-col cols="12" md="4">
              <!-- 游戏状态提示：仅剩一人有资金时结束 -->
              <v-alert
                v-if="isGameOver && winnerPlayer"
                type="success"
                variant="tonal"
                class="mb-4"
              >
                <div class="d-flex align-center justify-space-between">
                  <span
                    >游戏结束，仅剩玩家「{{
                      winnerPlayer.name
                    }}」有资金，获胜！</span
                  >
                  <v-btn
                    size="small"
                    color="success"
                    variant="flat"
                    @click="showStatsDialog = true"
                  >
                    查看统计
                  </v-btn>
                </div>
              </v-alert>

              <!-- 撤销/重做与重新开始 / 退出游戏（多人时仅房主可重新开始，非房主可退出） -->
              <v-card elevation="3" class="mb-4">
                <v-card-text
                  class="d-flex flex-nowrap justify-space-between gap-2"
                >
                  <v-btn
                    color="warning"
                    variant="outlined"
                    :disabled="!canUndo"
                    @click="undo"
                  >
                    <img
                      src="/footage/撤销.svg"
                      alt="撤销"
                      class="btn-icon mr-2"
                    />
                    撤销
                  </v-btn>
                  <v-btn
                    color="info"
                    variant="outlined"
                    :disabled="!canRedo"
                    @click="redo"
                  >
                    <img
                      src="/footage/重做.svg"
                      alt="重做"
                      class="btn-icon mr-2"
                    />
                    重做
                  </v-btn>
                  <v-btn
                    v-if="gameMode === 'multi' && multi.isHost.value"
                    color="error"
                    variant="outlined"
                    @click="showRestartDialog = true"
                  >
                    <img
                      src="/footage/重新开始.svg"
                      alt="重新开始"
                      class="btn-icon mr-2"
                    />
                    重新开始游戏
                  </v-btn>
                  <v-btn
                    v-if="gameMode === 'multi' && !multi.isHost.value"
                    color="secondary"
                    variant="outlined"
                    @click="onMultiDisconnect"
                  >
                    退出游戏
                  </v-btn>
                  <v-btn
                    v-if="gameMode !== 'multi'"
                    color="error"
                    variant="outlined"
                    @click="showRestartDialog = true"
                  >
                    <img
                      src="/footage/重新开始.svg"
                      alt="重新开始"
                      class="btn-icon mr-2"
                    />
                    重新开始游戏
                  </v-btn>
                </v-card-text>
              </v-card>

              <!-- 玩家模块（无回合概念，仅展示玩家列表） -->
              <div class="mb-4">
                <div class="player-grid">
                  <v-card
                    v-for="p in players"
                    :key="p.id"
                    class="player-card-compact"
                    :class="{
                      'player-card-bankrupt': p.bankrupt,
                    }"
                    variant="outlined"
                    :color="p.color"
                    :disabled="p.bankrupt"
                  >
                    <div class="pa-2">
                      <div class="d-flex align-center">
                        <v-avatar size="28" class="mr-2" :color="p.color">
                          <span
                            class="text-caption font-weight-bold text-white"
                          >
                            {{ p.name.trim().charAt(0) || "?" }}
                          </span>
                        </v-avatar>
                        <div class="flex-grow-1 overflow-hidden">
                          <div
                            class="text-caption font-weight-bold text-truncate"
                          >
                            {{ p.name || "未命名" }}
                          </div>
                          <div
                            class="text-subtitle-1 font-weight-bold"
                            :class="{
                              'text-success': p.cash >= START_MONEY,
                              'text-warning':
                                p.cash >= 0 && p.cash < START_MONEY,
                              'text-error': p.cash < 0,
                            }"
                          >
                            ¥{{ p.cash.toLocaleString() }}
                          </div>
                        </div>
                        <v-chip
                          v-if="p.bankrupt"
                          size="x-small"
                          color="error"
                          variant="tonal"
                          class="ml-1"
                        >
                          破产
                        </v-chip>
                      </div>
                    </div>
                  </v-card>
                </div>
              </div>

              <!-- 资金操作面板 -->
              <v-card elevation="3">
                <v-card-title class="d-flex align-center">
                  <img
                    src="/footage/价格.svg"
                    alt="price"
                    style="width: 24px; height: 24px; margin-right: 8px"
                  />
                  <span class="text-h6 font-weight-bold">资金操作</span>
                </v-card-title>
                <v-divider />
                <v-card-text>
                  <!-- 操作对象玩家显示（多人时为「我」，否则为当前选中玩家） -->
                  <div
                    v-if="displayPlayerForActions"
                    class="d-flex align-center mb-3 pa-2 rounded"
                    :style="{
                      backgroundColor: displayPlayerForActions.color + '22',
                    }"
                  >
                    <v-avatar
                      size="32"
                      :color="displayPlayerForActions.color"
                      class="mr-2"
                    >
                      <span class="text-caption font-weight-bold text-white">
                        {{
                          displayPlayerForActions.name.trim().charAt(0) || "?"
                        }}
                      </span>
                    </v-avatar>
                    <span class="text-subtitle-1 font-weight-bold">
                      {{ gameMode === "multi" ? "我 · " : ""
                      }}{{ displayPlayerForActions.name || "未命名" }}
                    </span>
                  </div>
                  <div v-else class="text-caption text-medium-emphasis mb-3">
                    请先选择玩家
                  </div>

                  <div class="d-flex gap-1 mb-2 fund-action-row">
                    <v-btn
                      color="success"
                      variant="tonal"
                      class="flex-grow-1 flex-shrink-0 fund-action-btn"
                      :disabled="
                        gameMode === 'multi'
                          ? isGameOver
                          : !currentPlayerId || isGameOver
                      "
                      @click="passStart"
                    >
                      <div class="text-center py-1">
                        <div class="text-caption">路过起点</div>
                        <div class="text-body-2 font-weight-bold">+¥2,000</div>
                      </div>
                    </v-btn>
                    <v-btn
                      color="error"
                      variant="tonal"
                      class="flex-grow-1 flex-shrink-0 fund-action-btn"
                      :disabled="
                        gameMode === 'multi'
                          ? isGameOver
                          : !currentPlayerId || isGameOver
                      "
                      @click="housingCrash"
                    >
                      <div class="text-center py-1">
                        <div class="text-caption">楼市暴跌</div>
                        <div class="text-body-2 font-weight-bold">-¥1,000</div>
                      </div>
                    </v-btn>
                    <v-btn
                      color="teal"
                      variant="tonal"
                      class="flex-grow-1 flex-shrink-0 fund-action-btn"
                      :disabled="isGameOver"
                      @click="commonProsperity"
                    >
                      <div class="text-center py-1">
                        <div class="text-caption">共同富裕</div>
                        <div class="text-body-2 font-weight-bold">+¥1,000</div>
                      </div>
                    </v-btn>
                  </div>

                  <v-divider class="my-3" />

                  <div class="text-caption text-medium-emphasis mb-2">
                    快速选择金额
                  </div>
                  <div class="d-flex flex-wrap gap-2 mb-3">
                    <v-btn
                      v-for="amount in [
                        100, 200, 300, 400, 500, 600, 800, 1000, 1200, 1500,
                      ]"
                      :key="amount"
                      size="small"
                      :color="
                        customMoneyAmount === amount ? 'primary' : undefined
                      "
                      :variant="
                        customMoneyAmount === amount ? 'flat' : 'outlined'
                      "
                      :disabled="isGameOver"
                      @click="customMoneyAmount = amount"
                    >
                      ¥{{ amount.toLocaleString() }}
                    </v-btn>
                  </div>

                  <div class="d-flex gap-2">
                    <v-btn
                      class="flex-grow-1"
                      color="success"
                      variant="outlined"
                      :disabled="
                        gameMode === 'multi'
                          ? !customMoneyAmount || isGameOver
                          : !currentPlayerId || !customMoneyAmount || isGameOver
                      "
                      @click="addCustomMoney"
                    >
                      增加
                    </v-btn>
                    <v-btn
                      class="flex-grow-1"
                      color="error"
                      variant="outlined"
                      :disabled="
                        gameMode === 'multi'
                          ? !customMoneyAmount || isGameOver
                          : !currentPlayerId || !customMoneyAmount || isGameOver
                      "
                      @click="subtractCustomMoney"
                    >
                      减少
                    </v-btn>
                  </div>
                </v-card-text>
              </v-card>

              <v-card elevation="3">
                <v-card-title class="d-flex align-center">
                  <img
                    src="/footage/记录.svg"
                    alt="record"
                    style="width: 24px; height: 24px; margin-right: 8px"
                  />
                  <span class="text-h6 font-weight-bold">最近记录</span>
                </v-card-title>
                <v-divider />
                <v-card-text>
                  <v-virtual-scroll
                    ref="logVirtualRef"
                    class="log-virtual"
                    :items="displayLogs"
                    :height="LOG_VIEWPORT_HEIGHT"
                    :item-height="LOG_ROW_HEIGHT"
                  >
                    <template #default="{ item }">
                      <div class="log-item">
                        <v-avatar size="10" :color="item.color" class="mr-2" />
                        <div class="flex-1-1">
                          <div class="text-caption">
                            {{ item.message }}
                          </div>
                          <div class="text-caption text-medium-emphasis">
                            {{ item.time }}
                          </div>
                        </div>
                      </div>
                      <v-divider />
                    </template>
                  </v-virtual-scroll>
                  <div
                    v-if="displayLogs.length === 0"
                    class="text-caption text-disabled mt-2"
                  >
                    暂无记录。
                  </div>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" md="8">
              <v-card elevation="3" class="mb-4">
                <v-card-title class="d-flex align-center py-2">
                  <img
                    src="/footage/城市.svg"
                    alt="city"
                    style="width: 22px; height: 22px; margin-right: 6px"
                  />
                  <span class="text-subtitle-1 font-weight-bold mr-4"
                    >城市地产</span
                  >
                  <v-text-field
                    v-model="cityKeyword"
                    placeholder="搜索城市拼音"
                    density="compact"
                    variant="outlined"
                    hide-details
                    clearable
                    style="min-width: 140px"
                  />
                  <v-spacer />
                  <v-btn-toggle
                    v-model="cityViewMode"
                    density="compact"
                    mandatory
                    color="primary"
                  >
                    <v-btn value="grid" size="x-small">
                      <img
                        src="/footage/grid.svg"
                        alt="网格"
                        style="width: 18px; height: 18px"
                      />
                    </v-btn>
                    <v-btn value="table" size="x-small">
                      <img
                        src="/footage/table.svg"
                        alt="表格"
                        style="width: 18px; height: 18px"
                      />
                    </v-btn>
                  </v-btn-toggle>
                </v-card-title>
                <v-divider />
                <v-card-text class="pa-3">
                  <!-- 表格视图 -->
                  <v-table
                    v-if="cityViewMode === 'table'"
                    density="compact"
                    class="city-table"
                  >
                    <thead>
                      <tr>
                        <th>城市</th>
                        <th class="text-right">价格</th>
                        <th class="text-center">持有</th>
                        <th class="text-center">建筑</th>
                        <th class="text-center">抵押</th>
                        <th class="text-right">观光费</th>
                        <th class="text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="city in filteredCities"
                        :key="city.config.name"
                        :style="{
                          background: `linear-gradient(90deg, ${city.config.color}40 0%, ${city.config.color}15 30%, transparent 100%)`,
                        }"
                      >
                        <td>
                          <div class="d-flex align-center">
                            <span
                              class="color-dot mr-2"
                              :style="{ backgroundColor: city.config.color }"
                            />
                            <span>{{ city.config.name }}</span>
                          </div>
                        </td>
                        <td class="text-right">
                          <div class="text-caption text-medium-emphasis">
                            空地 ¥{{ city.config.landPrice.toLocaleString() }}
                          </div>
                          <div class="text-caption text-medium-emphasis">
                            民宿 ¥{{ city.config.housePrice.toLocaleString() }}
                          </div>
                          <div class="text-caption text-medium-emphasis">
                            度假村 ¥{{
                              city.config.resortPrice.toLocaleString()
                            }}
                          </div>
                        </td>
                        <td class="text-center">
                          <div v-if="city.ownerId && ownerMap[city.ownerId]">
                            <v-avatar
                              size="24"
                              class="mb-1"
                              :color="ownerMap[city.ownerId].color"
                            >
                              <span class="text-caption font-weight-bold">
                                {{
                                  ownerMap[city.ownerId].name
                                    .trim()
                                    .charAt(0) || "?"
                                }}
                              </span>
                            </v-avatar>
                            <div class="text-caption">
                              {{ ownerMap[city.ownerId].name || "玩家" }}
                            </div>
                          </div>
                          <span v-else class="text-disabled text-caption"
                            >无人持有</span
                          >
                        </td>
                        <td class="text-center">
                          <div class="d-flex flex-column align-center">
                            <div class="d-flex align-center mb-1">
                              <img
                                v-for="n in city.houseCount"
                                :key="n"
                                src="/footage/民宿.svg"
                                alt="house"
                                style="
                                  width: 16px;
                                  height: 16px;
                                  margin-right: 2px;
                                "
                              />
                              <img
                                v-if="city.hasResort"
                                src="/footage/度假村.svg"
                                alt="resort"
                                style="width: 18px; height: 18px"
                              />
                            </div>
                            <div class="text-caption text-medium-emphasis">
                              {{ buildingStageText(city) }}
                            </div>
                          </div>
                        </td>
                        <td class="text-center">
                          <template v-if="city.isMortgaged">
                            <v-chip size="small" color="orange" variant="tonal">
                              已抵押
                            </v-chip>
                            <div class="text-caption text-medium-emphasis mt-1">
                              赎回：¥{{
                                city.config.redeemPrice.toLocaleString()
                              }}
                            </div>
                          </template>
                          <span
                            v-else
                            class="text-caption text-medium-emphasis"
                          >
                            可抵押：¥{{
                              city.config.mortgagePrice.toLocaleString()
                            }}
                          </span>
                        </td>
                        <td class="text-right">
                          <div class="d-flex flex-column align-end">
                            <span class="text-body-2 font-weight-medium">
                              ¥{{ calcSightseeingFee(city).toLocaleString() }}
                            </span>
                            <span
                              v-if="hasMonoColor(city)"
                              class="text-caption text-red-accent-2"
                            >
                              同色|观光费×2
                            </span>
                            <span
                              v-if="city.isMortgaged"
                              class="text-caption text-medium-emphasis"
                            >
                              抵押中
                            </span>
                          </div>
                        </td>
                        <td class="text-right">
                          <div
                            class="d-flex flex-wrap justify-end gap-1 align-center"
                          >
                            <v-btn
                              size="x-small"
                              color="primary"
                              variant="tonal"
                              :disabled="!canBuyLand(city)"
                              @click="buyLand(city)"
                            >
                              <img
                                src="/footage/空地.svg"
                                alt="land"
                                style="
                                  width: 16px;
                                  height: 16px;
                                  margin-right: 4px;
                                "
                              />
                              购地
                            </v-btn>
                            <v-btn
                              size="x-small"
                              color="green"
                              variant="tonal"
                              :disabled="!canBuildHouse(city)"
                              @click="buildHouse(city)"
                            >
                              <img
                                src="/footage/民宿.svg"
                                alt="house"
                                style="
                                  width: 16px;
                                  height: 16px;
                                  margin-right: 4px;
                                "
                              />
                              民宿
                            </v-btn>
                            <v-btn
                              size="x-small"
                              color="deep-purple"
                              variant="tonal"
                              :disabled="!canBuildResort(city)"
                              @click="buildResort(city)"
                            >
                              <img
                                src="/footage/度假村.svg"
                                alt="resort"
                                style="
                                  width: 16px;
                                  height: 16px;
                                  margin-right: 4px;
                                "
                              />
                              度假村
                            </v-btn>
                            <!-- 收取观光费（多人直接支付，不弹窗） -->
                            <v-btn
                              size="x-small"
                              color="blue"
                              variant="outlined"
                              :disabled="
                                gameMode === 'multi'
                                  ? !canCollectFeeAsCurrentPlayer(city)
                                  : !canCollectFee(city)
                              "
                              @click="openCollectFeeDialog(city)"
                            >
                              <img
                                src="/footage/观光费.svg"
                                alt="观光费"
                                style="
                                  width: 16px;
                                  height: 16px;
                                  margin-right: 4px;
                                "
                              />
                              观光费
                            </v-btn>
                            <!-- 抵押：下拉选择 -->
                            <v-menu
                              location="bottom end"
                              :close-on-content-click="true"
                            >
                              <template #activator="{ props }">
                                <v-btn
                                  v-bind="props"
                                  size="x-small"
                                  color="orange"
                                  variant="outlined"
                                >
                                  <img
                                    src="/footage/抵押.svg"
                                    alt="mortgage"
                                    style="
                                      width: 16px;
                                      height: 16px;
                                      margin-right: 4px;
                                    "
                                  />
                                  抵押
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    class="ml-1"
                                  >
                                    <path d="M7 10l5 5 5-5z" />
                                  </svg>
                                </v-btn>
                              </template>
                              <v-list density="compact">
                                <v-list-item
                                  :disabled="!canMortgage(city)"
                                  @click="mortgageCity(city)"
                                >
                                  <template #prepend>
                                    <img
                                      src="/footage/抵押.svg"
                                      alt=""
                                      style="
                                        width: 18px;
                                        height: 18px;
                                        margin-right: 8px;
                                      "
                                    />
                                  </template>
                                  <v-list-item-title>抵押</v-list-item-title>
                                </v-list-item>
                                <v-list-item
                                  :disabled="!canRedeem(city)"
                                  @click="redeemCity(city)"
                                >
                                  <template #prepend>
                                    <img
                                      src="/footage/赎回.svg"
                                      alt=""
                                      style="
                                        width: 18px;
                                        height: 18px;
                                        margin-right: 8px;
                                      "
                                    />
                                  </template>
                                  <v-list-item-title>赎回</v-list-item-title>
                                </v-list-item>
                              </v-list>
                            </v-menu>

                            <!-- 机会：下拉选择 -->
                            <v-menu
                              location="bottom end"
                              :close-on-content-click="true"
                            >
                              <template #activator="{ props }">
                                <v-btn
                                  v-bind="props"
                                  size="x-small"
                                  color="purple"
                                  variant="outlined"
                                >
                                  机会
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    class="ml-1"
                                  >
                                    <path d="M7 10l5 5 5-5z" />
                                  </svg>
                                </v-btn>
                              </template>
                              <v-list density="compact">
                                <v-list-item
                                  :disabled="!canBuyWithFee(city)"
                                  @click="buyCityWithFee(city)"
                                >
                                  <v-list-item-title
                                    >拿来吧你！</v-list-item-title
                                  >
                                </v-list-item>
                                <v-list-item
                                  :disabled="!canDestroyBuildings(city)"
                                  @click="destroyBuildings(city)"
                                >
                                  <v-list-item-title
                                    >怪兽来袭！</v-list-item-title
                                  >
                                </v-list-item>
                                <v-list-item
                                  :disabled="!canAngelDescends(city)"
                                  @click="angelDescends(city)"
                                >
                                  <v-list-item-title>
                                    天使降临
                                  </v-list-item-title>
                                </v-list-item>
                                <v-list-item
                                  :disabled="!canSwapProperty(city)"
                                  @click="openSwapDialog(city)"
                                >
                                  <v-list-item-title>
                                    交换房产
                                  </v-list-item-title>
                                </v-list-item>
                              </v-list>
                            </v-menu>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </v-table>

                  <!-- 网格视图 -->
                  <div v-else class="city-grid">
                    <div
                      v-for="city in filteredCities"
                      :key="city.config.name"
                      class="city-grid-item"
                      :style="{
                        borderLeftColor: city.config.color,
                        background: `linear-gradient(135deg, ${city.config.color}45 0%, ${city.config.color}18 50%, transparent 100%)`,
                      }"
                    >
                      <!-- 标题行：城市名 + 持有人 + 建筑状态 -->
                      <div
                        class="d-flex align-center justify-space-between mb-2"
                      >
                        <div class="d-flex align-center">
                          <span class="text-body-2 font-weight-bold mr-2">
                            {{ city.config.name }}
                          </span>
                          <template
                            v-if="city.ownerId && ownerMap[city.ownerId]"
                          >
                            <v-avatar
                              size="20"
                              :color="ownerMap[city.ownerId].color"
                            >
                              <span style="font-size: 10px; font-weight: bold">
                                {{
                                  ownerMap[city.ownerId].name
                                    .trim()
                                    .charAt(0) || "?"
                                }}
                              </span>
                            </v-avatar>
                          </template>
                        </div>
                        <div class="d-flex align-center gap-1">
                          <v-chip
                            v-if="city.isMortgaged"
                            size="x-small"
                            color="orange"
                            variant="tonal"
                          >
                            已抵押
                          </v-chip>
                          <img
                            v-for="n in city.houseCount"
                            :key="n"
                            src="/footage/民宿.svg"
                            alt="house"
                            style="width: 16px; height: 16px"
                          />
                          <img
                            v-if="city.hasResort"
                            src="/footage/度假村.svg"
                            alt="resort"
                            style="width: 18px; height: 18px"
                          />
                        </div>
                      </div>
                      <!-- 信息行：观光费 + 操作按钮 -->
                      <div class="d-flex align-center justify-space-between">
                        <span class="text-body-2">
                          <span class="text-medium-emphasis">观光费 </span>
                          <span class="font-weight-bold"
                            >¥{{
                              calcSightseeingFee(city).toLocaleString()
                            }}</span
                          >
                          <span
                            v-if="hasMonoColor(city)"
                            class="text-red-accent-2 ml-1"
                            >×2</span
                          >
                        </span>
                        <div class="d-flex gap-1">
                          <v-btn
                            size="x-small"
                            color="primary"
                            variant="tonal"
                            :disabled="!canBuyLand(city)"
                            @click="buyLand(city)"
                          >
                            购地
                          </v-btn>
                          <v-btn
                            size="x-small"
                            color="green"
                            variant="tonal"
                            :disabled="!canBuildHouse(city)"
                            @click="buildHouse(city)"
                          >
                            民宿
                          </v-btn>
                          <v-btn
                            size="x-small"
                            color="deep-purple"
                            variant="tonal"
                            :disabled="!canBuildResort(city)"
                            @click="buildResort(city)"
                          >
                            度假村
                          </v-btn>
                          <v-btn
                            size="x-small"
                            color="blue"
                            variant="outlined"
                            :disabled="
                              gameMode === 'multi'
                                ? !canCollectFeeAsCurrentPlayer(city)
                                : !canCollectFee(city)
                            "
                            @click="openCollectFeeDialog(city)"
                          >
                            观光费
                          </v-btn>
                          <v-menu
                            location="bottom end"
                            :close-on-content-click="true"
                          >
                            <template #activator="{ props }">
                              <v-btn
                                v-bind="props"
                                size="x-small"
                                color="orange"
                                variant="outlined"
                              >
                                抵押
                              </v-btn>
                            </template>
                            <v-list density="compact">
                              <v-list-item
                                :disabled="!canMortgage(city)"
                                @click="mortgageCity(city)"
                              >
                                <v-list-item-title>抵押</v-list-item-title>
                              </v-list-item>
                              <v-list-item
                                :disabled="!canRedeem(city)"
                                @click="redeemCity(city)"
                              >
                                <v-list-item-title>赎回</v-list-item-title>
                              </v-list-item>
                            </v-list>
                          </v-menu>
                          <v-menu
                            location="bottom end"
                            :close-on-content-click="true"
                          >
                            <template #activator="{ props }">
                              <v-btn
                                v-bind="props"
                                size="x-small"
                                color="purple"
                                variant="outlined"
                              >
                                机会
                              </v-btn>
                            </template>
                            <v-list density="compact">
                              <v-list-item
                                :disabled="!canBuyWithFee(city)"
                                @click="buyCityWithFee(city)"
                              >
                                <v-list-item-title
                                  >拿来吧你！</v-list-item-title
                                >
                              </v-list-item>
                              <v-list-item
                                :disabled="!canDestroyBuildings(city)"
                                @click="destroyBuildings(city)"
                              >
                                <v-list-item-title
                                  >怪兽来袭！</v-list-item-title
                                >
                              </v-list-item>
                              <v-list-item
                                :disabled="!canAngelDescends(city)"
                                @click="angelDescends(city)"
                              >
                                <v-list-item-title>天使降临</v-list-item-title>
                              </v-list-item>
                              <v-list-item
                                :disabled="!canSwapProperty(city)"
                                @click="openSwapDialog(city)"
                              >
                                <v-list-item-title>交换房产</v-list-item-title>
                              </v-list-item>
                            </v-list>
                          </v-menu>
                        </div>
                      </div>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>
      </v-container>
    </v-main>
    <!-- 收取观光费对话框 -->
    <v-dialog v-model="showCollectFeeDialog" max-width="500" persistent>
      <v-card v-if="selectedCityForFee">
        <v-card-title class="d-flex align-center">
          <img
            src="/footage/价格.svg"
            alt="price"
            style="width: 24px; height: 24px; margin-right: 8px"
          />
          <span class="text-h6">收取观光费</span>
        </v-card-title>
        <v-divider />
        <v-card-text>
          <div class="mb-4">
            <div class="text-subtitle-2 mb-2">城市信息</div>
            <v-card variant="outlined" class="pa-3">
              <div class="d-flex align-center mb-2">
                <span
                  class="color-dot mr-2"
                  :style="{
                    backgroundColor: selectedCityForFee.config.color,
                  }"
                />
                <span class="text-h6">{{
                  selectedCityForFee.config.name
                }}</span>
              </div>
              <div
                v-if="
                  selectedCityForFee.ownerId &&
                  ownerMap[selectedCityForFee.ownerId]
                "
              >
                <div class="text-caption text-medium-emphasis mb-1">持有者</div>
                <div class="d-flex align-center">
                  <v-avatar
                    size="32"
                    class="mr-2"
                    :color="ownerMap[selectedCityForFee.ownerId].color"
                  >
                    <span class="text-body-2 font-weight-bold text-white">
                      {{
                        ownerMap[selectedCityForFee.ownerId].name
                          .trim()
                          .charAt(0) || "?"
                      }}
                    </span>
                  </v-avatar>
                  <span>{{ ownerMap[selectedCityForFee.ownerId].name }}</span>
                </div>
              </div>
              <div v-else class="text-caption text-disabled">无人持有</div>
            </v-card>
          </div>

          <div class="mb-4">
            <div class="text-subtitle-2 mb-2">观光费金额</div>
            <div class="text-h5 font-weight-bold text-primary">
              ¥{{ collectFeeAmount.toLocaleString() }}
            </div>
            <div
              v-if="selectedCityForFee && hasMonoColor(selectedCityForFee)"
              class="text-caption text-red-accent-2 mt-1"
            >
              同色，观光费×2
            </div>
            <div
              v-if="selectedCityForFee && selectedCityForFee.isMortgaged"
              class="text-caption text-medium-emphasis mt-1"
            >
              抵押中，无法收取观光费
            </div>
          </div>

          <v-select
            v-model="collectFeeVisitorId"
            :items="availableVisitors"
            item-title="name"
            item-value="id"
            label="选择支付观光费的玩家"
            density="compact"
            variant="outlined"
            :disabled="collectFeeAmount === 0"
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props">
                <template #prepend>
                  <v-avatar size="32" :color="item.raw.color" class="mr-2">
                    <span class="text-body-2 font-weight-bold text-white">
                      {{ item.raw.name.trim().charAt(0) || "?" }}
                    </span>
                  </v-avatar>
                </template>
                <template #append>
                  <span class="text-body-2">
                    ¥{{ item.raw.cash.toLocaleString() }}
                  </span>
                </template>
              </v-list-item>
            </template>
          </v-select>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showCollectFeeDialog = false">
            取消
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!canConfirmCollectFee"
            @click="confirmCollectFee"
          >
            确认收取
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 重新开始游戏确认对话框 -->
    <v-dialog v-model="showRestartDialog" max-width="400" persistent>
      <v-card>
        <v-card-title class="text-h6">重新开始游戏</v-card-title>
        <v-card-text>
          确定要重新开始游戏吗？当前进度将丢失，需重新设置玩家并开始新局。
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showRestartDialog = false">
            取消
          </v-btn>
          <v-btn color="error" variant="flat" @click="confirmRestartGame">
            确定重新开始
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 游戏统计对话框 -->
    <v-dialog v-model="showStatsDialog" max-width="800">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-chart-bar" class="mr-2" />
          <span class="text-h6">游戏统计</span>
        </v-card-title>
        <v-divider />
        <v-card-text>
          <!-- 玩家资产排名 -->
          <div class="text-subtitle-1 font-weight-bold mb-2">玩家资产排名</div>
          <v-table density="compact" class="mb-4">
            <thead>
              <tr>
                <th>排名</th>
                <th>玩家</th>
                <th class="text-right">现金</th>
                <th class="text-right">地产价值</th>
                <th class="text-right">建筑价值</th>
                <th class="text-right">总资产</th>
                <th class="text-center">地产数</th>
                <th class="text-center">民宿数</th>
                <th class="text-center">度假村</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, idx) in playerFinalAssets"
                :key="item.player.id"
              >
                <td>
                  <v-chip
                    :color="
                      idx === 0
                        ? 'amber'
                        : idx === 1
                          ? 'grey'
                          : idx === 2
                            ? 'brown'
                            : 'default'
                    "
                    size="small"
                    variant="flat"
                  >
                    {{ idx + 1 }}
                  </v-chip>
                </td>
                <td>
                  <div class="d-flex align-center">
                    <v-avatar size="24" :color="item.player.color" class="mr-2">
                      <span class="text-caption font-weight-bold">
                        {{ item.player.name.trim().charAt(0) || "?" }}
                      </span>
                    </v-avatar>
                    {{ item.player.name }}
                    <v-chip
                      v-if="item.player.bankrupt"
                      size="x-small"
                      color="error"
                      class="ml-2"
                      >破产</v-chip
                    >
                  </div>
                </td>
                <td class="text-right">¥{{ item.cash.toLocaleString() }}</td>
                <td class="text-right">
                  ¥{{ item.landValue.toLocaleString() }}
                </td>
                <td class="text-right">
                  ¥{{ (item.houseValue + item.resortValue).toLocaleString() }}
                </td>
                <td class="text-right font-weight-bold">
                  ¥{{ item.totalAssets.toLocaleString() }}
                </td>
                <td class="text-center">{{ item.propertyCount }}</td>
                <td class="text-center">{{ item.houseCount }}</td>
                <td class="text-center">{{ item.resortCount }}</td>
              </tr>
            </tbody>
          </v-table>

          <!-- 玩家间资金流动 -->
          <div class="text-subtitle-1 font-weight-bold mb-2">
            玩家间资金流动（观光费）
          </div>
          <v-table density="compact">
            <thead>
              <tr>
                <th>支付方 → 收款方</th>
                <th v-for="p in players" :key="p.id" class="text-center">
                  <v-avatar size="20" :color="p.color">
                    <span style="font-size: 10px; font-weight: bold">
                      {{ p.name.trim().charAt(0) || "?" }}
                    </span>
                  </v-avatar>
                </th>
                <th class="text-right">总支出</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in players" :key="p.id">
                <td>
                  <div class="d-flex align-center">
                    <v-avatar size="20" :color="p.color" class="mr-2">
                      <span style="font-size: 10px; font-weight: bold">
                        {{ p.name.trim().charAt(0) || "?" }}
                      </span>
                    </v-avatar>
                    {{ p.name }}
                  </div>
                </td>
                <td v-for="p2 in players" :key="p2.id" class="text-center">
                  <template v-if="p.id === p2.id">-</template>
                  <template v-else>
                    <span
                      :class="{
                        'text-error': transferSummary[p.id]?.[p2.id] > 0,
                      }"
                    >
                      {{
                        transferSummary[p.id]?.[p2.id]
                          ? `¥${transferSummary[p.id][p2.id].toLocaleString()}`
                          : "-"
                      }}
                    </span>
                  </template>
                </td>
                <td class="text-right font-weight-bold text-error">
                  ¥{{
                    Object.values(transferSummary[p.id] || {})
                      .reduce((a: number, b: number) => a + b, 0)
                      .toLocaleString()
                  }}
                </td>
              </tr>
              <tr class="bg-grey-lighten-4">
                <td class="font-weight-bold">总收入</td>
                <td
                  v-for="p in players"
                  :key="p.id"
                  class="text-center font-weight-bold text-success"
                >
                  ¥{{
                    players
                      .reduce(
                        (sum, p2) =>
                          sum + (transferSummary[p2.id]?.[p.id] || 0),
                        0,
                      )
                      .toLocaleString()
                  }}
                </td>
                <td></td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="flat"
            color="primary"
            @click="showStatsDialog = false"
          >
            关闭
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 交换房产对话框 -->
    <v-dialog v-model="showSwapDialog" max-width="500" persistent>
      <v-card v-if="swapSourceCity">
        <v-card-title class="d-flex align-center">
          <span class="text-h6">交换房产</span>
        </v-card-title>
        <v-card-text>
          <div class="text-body-2 mb-3">
            将「<strong>{{ swapSourceCity.config.name }}</strong
            >」与其他玩家的地产交换
          </div>
          <v-select
            v-model="swapTargetCityIndex"
            :items="swappableTargetCities"
            item-title="label"
            item-value="index"
            label="选择要交换的地产"
            density="compact"
            variant="outlined"
          >
            <template #item="{ item, props }">
              <v-list-item v-bind="props">
                <template #prepend>
                  <v-avatar size="24" :color="item.raw.color" class="mr-2">
                    <span class="text-caption text-white">{{
                      item.raw.ownerInitial
                    }}</span>
                  </v-avatar>
                </template>
                <template #append>
                  <span class="text-caption text-medium-emphasis">
                    {{ item.raw.ownerName }}
                  </span>
                </template>
              </v-list-item>
            </template>
          </v-select>
          <v-alert
            v-if="swapTargetCityIndex !== null"
            type="info"
            variant="tonal"
            density="compact"
            class="mt-3"
          >
            交换后，对方将获得「{{ swapSourceCity.config.name }}」，你将获得「{{
              cities[swapTargetCityIndex]?.config.name
            }}」。对方无法拒绝此交换。
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="closeSwapDialog"> 取消 </v-btn>
          <v-btn
            color="teal"
            variant="flat"
            :disabled="swapTargetCityIndex === null"
            @click="confirmSwapProperty"
          >
            确认交换
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from "vue";
import { CITY_CONFIGS, type CityConfig } from "./data/cities";
import { useColyseusRoom } from "./composables/useColyseusRoom";

const START_MONEY = 10000;
const STORAGE_KEY = "monopoly-scoreboard-v1";
const MAX_HISTORY = 50; // 最多保存50个历史状态

interface Player {
  id: string;
  name: string;
  color: string;
  cash: number;
  bankrupt: boolean;
}

interface CityState {
  config: CityConfig;
  ownerId: string | null;
  houseCount: number; // 0-3
  hasResort: boolean;
  isMortgaged: boolean;
}

interface GameState {
  players: Player[];
  cities: CityState[];
  currentPlayerId: string | null;
  isGameOver: boolean;
  /** 最近记录（兼容旧存档：可能不存在） */
  logs?: LogItem[];
  /** 统计数据（兼容旧存档：可能不存在） */
  cashHistory?: CashRecord[];
  transferHistory?: TransferRecord[];
  propertyHistory?: PropertyRecord[];
}

interface LogItem {
  message: string;
  time: string;
  color: string;
}

// 统计数据接口
interface CashRecord {
  playerId: string;
  cash: number;
  timestamp: number;
}

interface TransferRecord {
  fromId: string;
  toId: string;
  amount: number;
  reason: string;
  timestamp: number;
}

interface PropertyRecord {
  playerId: string;
  propertyCount: number;
  houseCount: number;
  resortCount: number;
  timestamp: number;
}

const LOG_ROW_HEIGHT = 56;
const LOG_VIEWPORT_HEIGHT = LOG_ROW_HEIGHT * 6;

const colorPresets = [
  "#1976D2",
  "#C2185B",
  "#00796B",
  "#F57C00",
  "#7B1FA2",
  "#388E3C",
  "#D32F2F",
  "#0097A7",
];

const defaultPlayerNames = [
  "小富翁",
  "大地主",
  "小财神",
  "拆迁队长",
  "地皮大王",
  "投资狂人",
];

// 仅保留多人游戏
const gameMode = ref<"multi">("multi");
const multi = useColyseusRoom();
const multiMaxPlayers = ref(4);
const multiRoomIdInput = ref("");
const myLobbyName = ref("");
const canReconnect = computed(() => {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("monopoly:reconnectToken");
});

const multiShareLink = computed(() => {
  const r = multi.room.value;
  if (!r) return "";
  const id = (r as { roomId?: string }).roomId ?? "";
  const base =
    typeof window !== "undefined"
      ? window.location.origin + window.location.pathname
      : "";
  return `${base}?roomId=${id}`;
});

/** 大厅中已被其他玩家占用的颜色（自己当前颜色不算占用） */
const lobbyColorsTakenByOthers = computed(() => {
  const myId = multi.mySessionId.value;
  return new Set(
    multi.lobbySlots.value
      .filter((s) => s.sessionId && s.sessionId !== myId)
      .map((s) => s.color),
  );
});

function onMyLobbyNameChange(v: string) {
  myLobbyName.value = v;
  multi.send("setPlayerName", { name: v });
}

function onMultiCreateRoom() {
  multi.createRoom(multiMaxPlayers.value).then(() => {
    myLobbyName.value =
      multi.lobbySlots.value.find(
        (s) => s.sessionId === multi.mySessionId.value,
      )?.name ?? "玩家";
  });
}

function parseRoomIdFromInput(input: string): string {
  const s = input.trim();
  const m = s.match(/roomId=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  return s;
}

function onMultiRoomIdPaste(e: ClipboardEvent) {
  const t = (e.target as HTMLInputElement)?.value || "";
  const pasted = (e.clipboardData?.getData("text") || "").trim();
  if (pasted && (pasted.includes("roomId=") || pasted.length < 50)) {
    multiRoomIdInput.value = pasted;
    e.preventDefault();
  }
}

function onMultiJoinRoom() {
  multi.joinRoom(parseRoomIdFromInput(multiRoomIdInput.value));
}

function onMultiDisconnect() {
  // 主动退出游戏：服务端将重置名下地产（掉线/刷新不触发此逻辑）
  if (multi.phase.value === "playing") {
    multi.send("quitGame");
  }
  multi.disconnect(true);
}

async function copyMultiShareLink() {
  const text = multiShareLink.value;
  const fallbackCopy = () => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      return document.execCommand("copy");
    } finally {
      document.body.removeChild(ta);
    }
  };
  try {
    if (navigator.clipboard?.writeText)
      await navigator.clipboard.writeText(text);
    else if (!fallbackCopy()) throw new Error("unsupported");
  } catch {
    if (!fallbackCopy()) {
      alert("复制失败，请手动复制");
      return;
    }
  }
  alert("链接已复制到剪贴板");
}

// 从 URL 解析 roomId 并自动加入
if (typeof window !== "undefined") {
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get("roomId");
  const hasReconnectToken = !!localStorage.getItem("monopoly:reconnectToken");
  if (hasReconnectToken) {
    // 优先尝试断线重连（刷新/掉线后恢复同一局）
    multi.reconnect().catch(() => {
      // 重连失败（token 过期等），再走普通 join
      if (roomId) {
        multiRoomIdInput.value = roomId;
        multi.joinRoom(roomId).catch(() => {});
      }
    });
  } else if (roomId) {
    multiRoomIdInput.value = roomId;
    multi.joinRoom(roomId).catch(() => {});
  }
}

watch(
  () =>
    multi.lobbySlots.value.find((s) => s.sessionId === multi.mySessionId.value)
      ?.name,
  (name) => {
    if (name != null && name !== myLobbyName.value) myLobbyName.value = name;
  },
);

// 多人游戏进行中时，将服务端状态同步到本地用于展示
watch(
  () =>
    gameMode.value === "multi" && multi.phase.value === "playing"
      ? {
          players: multi.players.value,
          cities: multi.cities.value,
          currentPlayerId: multi.currentPlayerId.value,
          isGameOver: multi.isGameOver.value,
          logs: multi.logs.value,
        }
      : null,
  (data) => {
    if (!data) return;
    players.value = data.players.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      cash: p.cash,
      bankrupt: p.bankrupt,
    }));
    const cityMap = new Map(data.cities.map((c) => [c.cityName, c]));
    cities.value = CITY_CONFIGS.map((config) => {
      const s = cityMap.get(config.name);
      return {
        config,
        ownerId: s?.ownerId || null,
        houseCount: s?.houseCount ?? 0,
        hasResort: s?.hasResort ?? false,
        isMortgaged: s?.isMortgaged ?? false,
      };
    });
    currentPlayerId.value = data.currentPlayerId || null;
    isGameOver.value = data.isGameOver;
    logs.value = data.logs.map((l) => ({
      message: l.message,
      time: l.time,
      color: l.color,
    }));
  },
  { immediate: true, deep: true },
);

const playerCount = ref(4);
const editablePlayers = reactive<Player[]>(
  Array.from({ length: 6 }).map((_, idx) => ({
    id: `P${idx + 1}`,
    name: defaultPlayerNames[idx] ?? `玩家${idx + 1}`,
    color: colorPresets[idx % colorPresets.length],
    cash: START_MONEY,
    bankrupt: false,
  })),
);

const players = ref<Player[]>([]);
const cities = ref<CityState[]>([]);
const currentPlayerId = ref<string | null>(null);
const isGameOver = ref(false);

const logs = ref<LogItem[]>([]);

// 统计数据
const cashHistory = ref<CashRecord[]>([]);
const transferHistory = ref<TransferRecord[]>([]);
const propertyHistory = ref<PropertyRecord[]>([]);
const showStatsDialog = ref(false);

const importFileInputRef = ref<HTMLInputElement | null>(null);
const showRestartDialog = ref(false);

// 交换房产对话框相关
const showSwapDialog = ref(false);
const swapSourceCity = ref<CityState | null>(null);
const swapTargetCityIndex = ref<number | null>(null);

const cityViewMode = ref<"table" | "grid">("grid");
const cityKeyword = ref("");

// 收取观光费对话框相关
const showCollectFeeDialog = ref(false);
const selectedCityForFee = ref<CityState | null>(null);
const collectFeeVisitorId = ref<string | null>(null);

// 撤销/重做相关
const historyStack = ref<GameState[]>([]);
const historyIndex = ref(-1);

// 资金操作相关
const customMoneyAmount = ref<number | null>(null);

const hasActiveGame = computed(() => {
  if (gameMode.value === "multi") return multi.phase.value === "playing";
  return players.value.length > 0;
});
const currentPlayer = computed(
  () => players.value.find((p) => p.id === currentPlayerId.value) || null,
);
/** 资金操作面板所代表的玩家：多人时为「我」，否则为当前选中玩家 */
const displayPlayerForActions = computed(() => {
  if (gameMode.value === "multi") {
    return players.value.find((p) => p.id === multi.mySessionId.value) || null;
  }
  return currentPlayer.value;
});

/** 游戏结束时，唯一还有资金的玩家（获胜者） */
const winnerPlayer = computed(() => {
  const withCash = players.value.filter((p) => p.cash > 0);
  return withCash.length === 1 ? withCash[0] : null;
});

const ownerMap = computed<Record<string, Player>>(() => {
  const map: Record<string, Player> = {};
  for (const p of players.value) {
    map[p.id] = p;
  }
  return map;
});

const cityStates = computed(() => cities.value);

const filteredCities = computed(() => {
  const keyword = cityKeyword.value.trim();
  if (!keyword) return cityStates.value;
  const lower = keyword.toLowerCase();
  return cityStates.value.filter((c) => {
    if (c.config.name.includes(keyword)) return true;
    // 兼容旧存档：若 config 无 pinyin，则按城市名从 CITY_CONFIGS 取
    const pinyin =
      c.config.pinyin ??
      CITY_CONFIGS.find((cfg) => cfg.name === c.config.name)?.pinyin ??
      "";
    return pinyin.length > 0 && pinyin.includes(lower);
  });
});

// 交换房产：可交换的目标地产（其他玩家拥有的已购买地产）
const swappableTargetCities = computed(() => {
  const cp = displayPlayerForActions.value;
  if (!cp || !swapSourceCity.value) return [];
  return cities.value
    .map((city, index) => {
      const owner = city.ownerId ? ownerMap.value[city.ownerId] : null;
      return {
        index,
        label: city.config.name,
        color: city.config.color,
        ownerId: city.ownerId,
        ownerName: owner?.name || "",
        ownerInitial: owner?.name.trim().charAt(0) || "?",
      };
    })
    .filter(
      (item) =>
        item.ownerId !== null &&
        item.ownerId !== cp.id && // 不是自己的
        !cities.value[item.index].isMortgaged, // 没有被抵押
    );
});

// 最新在最上（索引 0），向下滚动可查看更早的记录
const displayLogs = computed(() => [...logs.value].reverse());

// 统计：玩家之间的资金流动汇总
const transferSummary = computed(() => {
  const summary: Record<string, Record<string, number>> = {};
  // 初始化
  for (const p of players.value) {
    summary[p.id] = {};
    for (const p2 of players.value) {
      if (p.id !== p2.id) {
        summary[p.id][p2.id] = 0;
      }
    }
  }
  // 汇总转账记录
  for (const t of transferHistory.value) {
    if (summary[t.fromId] && summary[t.fromId][t.toId] !== undefined) {
      summary[t.fromId][t.toId] += t.amount;
    }
  }
  return summary;
});

// 统计：每个玩家的最终资产（现金 + 房产价值）
const playerFinalAssets = computed(() => {
  return players.value
    .map((p) => {
      const ownedCities = cities.value.filter((c) => c.ownerId === p.id);
      const landValue = ownedCities.reduce(
        (sum, c) => sum + c.config.landPrice,
        0,
      );
      const houseValue = ownedCities.reduce(
        (sum, c) => sum + c.houseCount * c.config.housePrice,
        0,
      );
      const resortValue = ownedCities.reduce(
        (sum, c) => sum + (c.hasResort ? c.config.resortPrice : 0),
        0,
      );
      return {
        player: p,
        cash: p.cash,
        landValue,
        houseValue,
        resortValue,
        totalAssets: p.cash + landValue + houseValue + resortValue,
        propertyCount: ownedCities.length,
        houseCount: ownedCities.reduce((sum, c) => sum + c.houseCount, 0),
        resortCount: ownedCities.filter((c) => c.hasResort).length,
      };
    })
    .sort((a, b) => b.totalAssets - a.totalAssets);
});

const logVirtualRef = ref<any>(null);
function scrollLogsToLatest() {
  // 最新在最上 → 滚动到顶部
  const el = logVirtualRef.value?.$el as HTMLElement | undefined;
  if (!el) return;
  el.scrollTo({ top: 0, behavior: "smooth" });
}

const canUndo = computed(() =>
  gameMode.value === "multi" ? multi.canUndo.value : historyIndex.value > 0,
);
const canRedo = computed(() =>
  gameMode.value === "multi"
    ? multi.canRedo.value
    : historyIndex.value < historyStack.value.length - 1,
);

function createInitialCities(): CityState[] {
  return CITY_CONFIGS.map((config) => ({
    config,
    ownerId: null,
    houseCount: 0,
    hasResort: false,
    isMortgaged: false,
  }));
}

function snapshotGameState(): GameState {
  return {
    players: JSON.parse(JSON.stringify(players.value)),
    cities: JSON.parse(JSON.stringify(cities.value)),
    currentPlayerId: currentPlayerId.value,
    isGameOver: isGameOver.value,
    logs: JSON.parse(JSON.stringify(logs.value)),
    cashHistory: JSON.parse(JSON.stringify(cashHistory.value)),
    transferHistory: JSON.parse(JSON.stringify(transferHistory.value)),
    propertyHistory: JSON.parse(JSON.stringify(propertyHistory.value)),
  };
}

function saveStateToHistory() {
  const state = snapshotGameState();
  // 如果当前不在历史栈的末尾，删除后面的状态
  if (historyIndex.value < historyStack.value.length - 1) {
    historyStack.value = historyStack.value.slice(0, historyIndex.value + 1);
  }
  // 添加新状态
  historyStack.value.push(state);
  // 限制历史栈大小
  if (historyStack.value.length > MAX_HISTORY) {
    historyStack.value.shift();
  } else {
    historyIndex.value = historyStack.value.length - 1;
  }
}

function undo() {
  if (!canUndo.value) return;
  if (gameMode.value === "multi") {
    multi.send("undo");
    return;
  }
  historyIndex.value--;
  const state = historyStack.value[historyIndex.value];
  restoreGameState(state);
  addLog("已撤销上一步操作。", "warning");
}

function redo() {
  if (!canRedo.value) return;
  if (gameMode.value === "multi") {
    multi.send("redo");
    return;
  }
  historyIndex.value++;
  const state = historyStack.value[historyIndex.value];
  restoreGameState(state);
  addLog("已重做操作。", "info");
}

function restoreGameState(state: GameState) {
  players.value = JSON.parse(JSON.stringify(state.players));
  cities.value = JSON.parse(JSON.stringify(state.cities));
  currentPlayerId.value = state.currentPlayerId;
  isGameOver.value = state.isGameOver;
  logs.value = JSON.parse(JSON.stringify(state.logs ?? []));
  // 恢复统计数据（兼容旧存档）
  cashHistory.value = JSON.parse(JSON.stringify(state.cashHistory ?? []));
  transferHistory.value = JSON.parse(
    JSON.stringify(state.transferHistory ?? []),
  );
  propertyHistory.value = JSON.parse(
    JSON.stringify(state.propertyHistory ?? []),
  );
}

function persistState() {
  const state = snapshotGameState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadStateFromStorage(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    return parsed;
  } catch {
    return null;
  }
}

function initFromStorage() {
  const saved = loadStateFromStorage();
  if (saved && saved.players && saved.players.length > 0) {
    restoreGameState(saved);
    historyStack.value = [snapshotGameState()];
    historyIndex.value = 0;
  }
}

function startNewGameFromEditable() {
  const count = Math.min(Math.max(playerCount.value, 2), 6);
  const selected = editablePlayers.slice(0, count).map((p) => ({
    ...p,
    cash: START_MONEY,
    bankrupt: false,
  }));
  players.value = selected;
  cities.value = createInitialCities();
  currentPlayerId.value = selected[0]?.id ?? null;
  isGameOver.value = false;
  logs.value = [];
  // 重置历史栈
  historyStack.value = [];
  historyIndex.value = -1;
  saveStateToHistory();
  // 初始化统计数据
  initStats();
  persistState();
}

function onStartGame() {
  startNewGameFromEditable();
  addLog("已根据当前设置开始新游戏。", "primary");
}

function triggerImportFile() {
  importFileInputRef.value?.click();
}

function onImportFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const raw = reader.result as string;
      const parsed = JSON.parse(raw) as GameState;
      if (!parsed.players?.length || !Array.isArray(parsed.cities)) {
        throw new Error("无效的存档格式");
      }
      restoreGameState(parsed);
      historyStack.value = [snapshotGameState()];
      historyIndex.value = 0;
      persistState();
      addLog("已从文件导入存档并恢复游戏进度。", "primary");
    } catch (e) {
      console.error(e);
      alert("导入失败，请选择有效的存档 JSON 文件。");
    }
  };
  reader.readAsText(file, "UTF-8");
}

function addLog(message: string, color: string = "primary") {
  logs.value.push({
    message,
    color,
    time: new Date().toLocaleTimeString(),
  });
  void nextTick(() => scrollLogsToLatest());
}

// 记录所有玩家当前现金状态
function recordCashSnapshot() {
  const timestamp = Date.now();
  for (const player of players.value) {
    cashHistory.value.push({
      playerId: player.id,
      cash: player.cash,
      timestamp,
    });
  }
}

// 记录资金转移
function recordTransfer(
  fromId: string,
  toId: string,
  amount: number,
  reason: string,
) {
  transferHistory.value.push({
    fromId,
    toId,
    amount,
    reason,
    timestamp: Date.now(),
  });
}

// 记录房产快照
function recordPropertySnapshot() {
  const timestamp = Date.now();
  for (const player of players.value) {
    const ownedCities = cities.value.filter((c) => c.ownerId === player.id);
    propertyHistory.value.push({
      playerId: player.id,
      propertyCount: ownedCities.length,
      houseCount: ownedCities.reduce((sum, c) => sum + c.houseCount, 0),
      resortCount: ownedCities.filter((c) => c.hasResort).length,
      timestamp,
    });
  }
}

// 初始化统计数据
function initStats() {
  cashHistory.value = [];
  transferHistory.value = [];
  propertyHistory.value = [];
  recordCashSnapshot();
  recordPropertySnapshot();
}

function buildingStageText(city: CityState): string {
  if (city.isMortgaged) return "已抵押";
  if (!city.ownerId) return "无人持有";
  if (city.hasResort) return "度假村";
  if (city.houseCount === 0) return "仅空地";
  return `${city.houseCount} 间民宿`;
}

function hasMonoColor(city: CityState): boolean {
  if (!city.ownerId || city.isMortgaged) return false;
  const sameColorCities = cityStates.value.filter(
    (c) => c.config.color === city.config.color,
  );
  if (sameColorCities.length === 0) return false;
  return sameColorCities.every(
    (c) => c.ownerId === city.ownerId && !c.isMortgaged,
  );
}

function calcSightseeingFee(city: CityState): number {
  if (!city.ownerId || city.isMortgaged) return 0;
  let fee = city.config.baseFee;
  if (city.hasResort) {
    fee = city.config.resortFee;
  } else if (city.houseCount === 3) {
    fee = city.config.house3Fee;
  } else if (city.houseCount === 2) {
    fee = city.config.house2Fee;
  } else if (city.houseCount === 1) {
    fee = city.config.house1Fee;
  }
  if (hasMonoColor(city)) {
    fee *= 2;
  }
  return fee;
}

/** 获取「当前操作对象」：多人时为「我」，否则为当前选中玩家 */
function ensureCurrentPlayer(): Player | null {
  if (gameMode.value === "multi") {
    const me = players.value.find((p) => p.id === multi.mySessionId.value);
    if (!me || me.bankrupt) return null;
    return me;
  }
  const cp = currentPlayer.value;
  if (!cp || cp.bankrupt) return null;
  return cp;
}

function canBuyLand(city: CityState): boolean {
  if (isGameOver.value) return false;
  const cp = ensureCurrentPlayer();
  if (!cp) return false;
  if (city.ownerId) return false;
  if (city.isMortgaged) return false;
  return cp.cash >= city.config.landPrice;
}

function canBuildHouse(city: CityState): boolean {
  if (isGameOver.value) return false;
  const cp = ensureCurrentPlayer();
  if (!cp) return false;
  if (!city.ownerId || city.ownerId !== cp.id) return false;
  if (city.isMortgaged) return false;
  if (city.hasResort) return false;
  if (city.houseCount >= 3) return false;
  return cp.cash >= city.config.housePrice;
}

function canBuildResort(city: CityState): boolean {
  if (isGameOver.value) return false;
  const cp = ensureCurrentPlayer();
  if (!cp) return false;
  if (!city.ownerId || city.ownerId !== cp.id) return false;
  if (city.isMortgaged) return false;
  if (city.hasResort) return false;
  if (city.houseCount !== 3) return false;
  return cp.cash >= city.config.resortPrice;
}

function canMortgage(city: CityState): boolean {
  if (isGameOver.value) return false;
  const cp = ensureCurrentPlayer();
  if (!cp) return false;
  if (!city.ownerId || city.ownerId !== cp.id) return false;
  if (city.isMortgaged) return false;
  // if (city.houseCount > 0 || city.hasResort) return false;
  return true;
}

function canRedeem(city: CityState): boolean {
  if (isGameOver.value) return false;
  const cp = ensureCurrentPlayer();
  if (!cp) return false;
  if (!city.ownerId || city.ownerId !== cp.id) return false;
  if (!city.isMortgaged) return false;
  return cp.cash >= city.config.redeemPrice;
}

function buyLand(city: CityState) {
  if (gameMode.value === "multi") {
    multi.send("buyLand", { cityName: city.config.name });
    return;
  }
  const cp = ensureCurrentPlayer();
  if (!cp) return;
  if (!canBuyLand(city)) return;
  saveStateToHistory();
  cp.cash -= city.config.landPrice;
  city.ownerId = cp.id;
  recordCashSnapshot();
  recordPropertySnapshot();
  addLog(
    `玩家「${cp.name}」以 ¥${city.config.landPrice.toLocaleString()} 购买了「${city.config.name}」空地。`,
    "primary",
  );
  checkBankruptcy();
  persistState();
}

function buildHouse(city: CityState) {
  if (gameMode.value === "multi") {
    multi.send("buildHouse", { cityName: city.config.name });
    return;
  }
  const cp = ensureCurrentPlayer();
  if (!cp) return;
  if (!canBuildHouse(city)) return;
  saveStateToHistory();
  cp.cash -= city.config.housePrice;
  city.houseCount += 1;
  recordCashSnapshot();
  recordPropertySnapshot();
  addLog(
    `玩家「${cp.name}」在「${city.config.name}」新建 1 间民宿（当前共 ${city.houseCount} 间），花费 ¥${city.config.housePrice.toLocaleString()}。`,
    "green",
  );
  checkBankruptcy();
  persistState();
}

function buildResort(city: CityState) {
  if (gameMode.value === "multi") {
    multi.send("buildResort", { cityName: city.config.name });
    return;
  }
  const cp = ensureCurrentPlayer();
  if (!cp) return;
  if (!canBuildResort(city)) return;
  saveStateToHistory();
  cp.cash -= city.config.resortPrice;
  city.hasResort = true;
  recordCashSnapshot();
  recordPropertySnapshot();
  addLog(
    `玩家「${cp.name}」在「${city.config.name}」建成度假村，花费 ¥${city.config.resortPrice.toLocaleString()}。`,
    "deep-purple",
  );
  checkBankruptcy();
  persistState();
}

function mortgageCity(city: CityState) {
  if (gameMode.value === "multi") {
    multi.send("mortgage", { cityName: city.config.name });
    return;
  }
  const cp = ensureCurrentPlayer();
  if (!cp) return;
  if (!canMortgage(city)) return;
  saveStateToHistory();
  city.isMortgaged = true;
  cp.cash += city.config.mortgagePrice;
  addLog(
    `玩家「${cp.name}」抵押了「${city.config.name}」，获得 ¥${city.config.mortgagePrice.toLocaleString()}。`,
    "orange",
  );
  checkBankruptcy();
  persistState();
}

function redeemCity(city: CityState) {
  if (gameMode.value === "multi") {
    multi.send("redeem", { cityName: city.config.name });
    return;
  }
  const cp = ensureCurrentPlayer();
  if (!cp) return;
  if (!canRedeem(city)) return;
  saveStateToHistory();
  city.isMortgaged = false;
  cp.cash -= city.config.redeemPrice;
  addLog(
    `玩家「${cp.name}」赎回了「${city.config.name}」，支付 ¥${city.config.redeemPrice.toLocaleString()}。`,
    "teal",
  );
  checkBankruptcy();
  persistState();
}

function setCurrentPlayer(playerId: string) {
  if (gameMode.value === "multi") {
    if (!multi.isHost) return;
    multi.send("setCurrentPlayer", { playerId });
    return;
  }
  const player = players.value.find((p) => p.id === playerId);
  if (!player || player.bankrupt) return;
  if (currentPlayerId.value === playerId) return;
  saveStateToHistory();
  currentPlayerId.value = playerId;
  addLog(`当前回合切换为玩家「${player.name}」。`, "secondary");
  persistState();
}

function confirmRestartGame() {
  showRestartDialog.value = false;
  if (gameMode.value === "multi") {
    multi.send("restartGame");
    return;
  }
  players.value = [];
  cities.value = [];
  currentPlayerId.value = null;
  isGameOver.value = false;
  historyStack.value = [];
  historyIndex.value = -1;
  logs.value = [];
  localStorage.removeItem(STORAGE_KEY);
}

function checkBankruptcy() {
  // 资金低于 0 的玩家标记为破产（不立即结束游戏）
  for (const p of players.value) {
    if (!p.bankrupt && p.cash < 0) {
      p.bankrupt = true;
      addLog(`玩家「${p.name}」资金已低于 0，宣告破产。`, "error");
    }
  }
  // 仅当只剩一人有资金时，游戏结束
  const withCash = players.value.filter((p) => p.cash > 0);
  if (withCash.length === 1) {
    isGameOver.value = true;
    addLog(
      `仅剩玩家「${withCash[0].name}」有资金，游戏结束，${withCash[0].name} 获胜！`,
      "success",
    );
  }
}

// 收取观光费相关函数
const collectFeeAmount = computed(() => {
  if (!selectedCityForFee.value) return 0;
  return calcSightseeingFee(selectedCityForFee.value);
});

const availableVisitors = computed(() => {
  if (!selectedCityForFee.value || !selectedCityForFee.value.ownerId) {
    return [];
  }
  // 排除城市持有者和破产玩家
  return players.value.filter(
    (p) => p.id !== selectedCityForFee.value!.ownerId && !p.bankrupt,
  );
});

const canConfirmCollectFee = computed(() => {
  if (isGameOver.value) return false;
  if (!selectedCityForFee.value || !collectFeeVisitorId.value) return false;
  if (collectFeeAmount.value <= 0) return false;
  const visitor = players.value.find((p) => p.id === collectFeeVisitorId.value);
  if (!visitor || visitor.bankrupt || visitor.cash <= 0) return false;
  return true;
});

function canCollectFee(city: CityState): boolean {
  if (isGameOver.value) return false;
  if (!city.ownerId) return false;
  if (city.isMortgaged) return false;
  const fee = calcSightseeingFee(city);
  if (fee <= 0) return false;
  // 至少有一个非持有者且未破产的玩家可以支付
  const available = players.value.filter(
    (p) => p.id !== city.ownerId && !p.bankrupt,
  );
  return available.length > 0;
}

/** 多人模式：我是否可支付该城市观光费（直接付给地主，不弹窗） */
function canCollectFeeAsCurrentPlayer(city: CityState): boolean {
  if (gameMode.value !== "multi") return false;
  if (isGameOver.value) return false;
  const myId = multi.mySessionId.value;
  if (!city.ownerId || city.ownerId === myId) return false;
  if (city.isMortgaged) return false;
  const fee = calcSightseeingFee(city);
  if (fee <= 0) return false;
  const me = players.value.find((p) => p.id === myId);
  // 有剩余资金即可点（不足时支付全部后破产）
  return me != null && !me.bankrupt && me.cash > 0;
}

function openCollectFeeDialog(city: CityState) {
  if (gameMode.value === "multi") {
    paySightseeingFeeDirect(city);
    return;
  }
  selectedCityForFee.value = city;

  // 如果只有两个玩家，默认选择对面的玩家（非持有者）
  if (players.value.length === 2 && city.ownerId) {
    const available = players.value.filter(
      (p) => p.id !== city.ownerId && !p.bankrupt,
    );
    if (available.length === 1) {
      collectFeeVisitorId.value = available[0].id;
    } else {
      collectFeeVisitorId.value = null;
    }
  } else {
    collectFeeVisitorId.value = null;
  }

  showCollectFeeDialog.value = true;
}

/** 多人模式：当前玩家直接支付观光费给地主，不弹窗 */
function paySightseeingFeeDirect(city: CityState) {
  if (gameMode.value !== "multi") return;
  if (!canCollectFeeAsCurrentPlayer(city)) return;
  multi.send("collectFee", { cityName: city.config.name });
}

function confirmCollectFee() {
  if (
    gameMode.value === "multi" &&
    selectedCityForFee.value &&
    collectFeeVisitorId.value
  ) {
    multi.send("collectFee", {
      cityName: selectedCityForFee.value.config.name,
      visitorId: collectFeeVisitorId.value,
    });
    showCollectFeeDialog.value = false;
    selectedCityForFee.value = null;
    collectFeeVisitorId.value = null;
    return;
  }
  if (!canConfirmCollectFee.value || !selectedCityForFee.value) return;
  const city = selectedCityForFee.value;
  if (!city.ownerId) return;
  const owner = players.value.find((p) => p.id === city.ownerId);
  const visitor = players.value.find((p) => p.id === collectFeeVisitorId.value);
  if (!owner || !visitor || owner.id === visitor.id) return;

  const fee = collectFeeAmount.value;
  if (fee <= 0) return;

  saveStateToHistory();
  const amountToPay = Math.min(visitor.cash, fee);
  if (amountToPay <= 0) return;
  visitor.cash -= amountToPay;
  owner.cash += amountToPay;
  recordTransfer(
    visitor.id,
    owner.id,
    amountToPay,
    `观光费(${city.config.name})`,
  );
  recordCashSnapshot();
  if (amountToPay < fee) {
    visitor.bankrupt = true;
    addLog(
      `玩家「${visitor.name}」无法支付「${city.config.name}」观光费 ¥${fee.toLocaleString()}，已支付全部剩余资金 ¥${amountToPay.toLocaleString()} 给玩家「${owner.name}」，并宣告破产。`,
      "error",
    );
  } else {
    addLog(
      `玩家「${visitor.name}」在「${city.config.name}」支付观光费 ¥${fee.toLocaleString()} 给玩家「${owner.name}」。`,
      "primary",
    );
  }
  checkBankruptcy();
  persistState();
  showCollectFeeDialog.value = false;
  selectedCityForFee.value = null;
  collectFeeVisitorId.value = null;
}

// 资金操作函数
function passStart() {
  if (gameMode.value === "multi") {
    multi.send("passStart");
    return;
  }
  if (!currentPlayerId.value || isGameOver.value) return;
  const player = players.value.find((p) => p.id === currentPlayerId.value);
  if (!player || player.bankrupt) return;
  saveStateToHistory();
  player.cash += 2000;
  addLog(`玩家「${player.name}」路过起点，获得 ¥2,000。`, "success");
  checkBankruptcy();
  persistState();
}

function housingCrash() {
  if (gameMode.value === "multi") {
    multi.send("housingCrash");
    return;
  }
  if (!currentPlayerId.value || isGameOver.value) return;
  const player = players.value.find((p) => p.id === currentPlayerId.value);
  if (!player || player.bankrupt) return;
  saveStateToHistory();
  player.cash -= 1000;
  addLog(`玩家「${player.name}」遭遇楼市暴跌，损失 ¥1,000。`, "error");
  checkBankruptcy();
  persistState();
}

function commonProsperity() {
  if (gameMode.value === "multi") {
    multi.send("commonProsperity");
    return;
  }
  if (isGameOver.value) return;
  saveStateToHistory();
  const activePlayers = players.value.filter((p) => !p.bankrupt);
  for (const player of activePlayers) {
    player.cash += 1000;
  }
  const names = activePlayers.map((p) => `「${p.name}」`).join("、");
  addLog(`【共同富裕】所有玩家 ${names} 各获得 ¥1,000。`, "teal");
  persistState();
}

// 天使降临：判断是否可以执行（该地产是自己的且自己同色地产中有可升级的）
function canAngelDescends(city: CityState): boolean {
  if (isGameOver.value) return false;
  const cp = ensureCurrentPlayer();
  if (!cp) return false;
  if (!city.ownerId || city.ownerId !== cp.id) return false;
  const sameColorCities = cities.value.filter(
    (c) => c.ownerId === cp.id && c.config.color === city.config.color,
  );
  return sameColorCities.some((c) => !c.hasResort);
}

// 天使降临：执行升级
function angelDescends(city: CityState) {
  if (!canAngelDescends(city)) return;
  if (gameMode.value === "multi") {
    multi.send("angelDescends", { cityName: city.config.name });
    return;
  }

  const targetColor = city.config.color;
  const cp = ensureCurrentPlayer();
  if (!cp) return;
  const sameColorCities = cities.value.filter(
    (c) => c.ownerId === cp.id && c.config.color === targetColor,
  );

  saveStateToHistory();

  const upgradedCities: string[] = [];

  for (const c of sameColorCities) {
    // 跳过已满的地产（度假村）
    if (c.hasResort) continue;

    if (c.houseCount < 3) {
      // 民宿未满，加一间民宿
      c.houseCount++;
      upgradedCities.push(`${c.config.name}(+1民宿)`);
    } else {
      // 民宿满了，建度假村
      c.hasResort = true;
      upgradedCities.push(`${c.config.name}(+度假村)`);
    }
  }

  if (upgradedCities.length > 0) {
    addLog(`【天使降临】同色地产升级：${upgradedCities.join("、")}`, "purple");
  } else {
    addLog(`【天使降临】所有同色地产均已达到最高等级。`, "purple");
  }

  persistState();
}

// 交换房产：判断是否可以执行（该地产是当前玩家的且未抵押，且有其他玩家的地产可交换）
function canSwapProperty(city: CityState): boolean {
  if (isGameOver.value) return false;
  const cp = ensureCurrentPlayer();
  if (!cp) return false;
  if (!city.ownerId || city.ownerId !== cp.id) return false; // 必须是自己的
  if (city.isMortgaged) return false; // 不能是抵押状态
  // 检查是否有其他玩家的地产可交换
  return cities.value.some(
    (c) => c.ownerId !== null && c.ownerId !== cp.id && !c.isMortgaged,
  );
}

// 交换房产：打开对话框
function openSwapDialog(city: CityState) {
  if (!canSwapProperty(city)) return;
  swapSourceCity.value = city;
  swapTargetCityIndex.value = null;
  showSwapDialog.value = true;
}

// 交换房产：关闭对话框
function closeSwapDialog() {
  showSwapDialog.value = false;
  swapSourceCity.value = null;
  swapTargetCityIndex.value = null;
}

// 交换房产：确认执行
function confirmSwapProperty() {
  if (!swapSourceCity.value || swapTargetCityIndex.value === null) return;
  const cp = ensureCurrentPlayer();
  if (!cp) return;

  const sourceCity = swapSourceCity.value;
  const targetCity = cities.value[swapTargetCityIndex.value];
  if (!targetCity || !targetCity.ownerId) return;

  if (gameMode.value === "multi") {
    multi.send("swapProperty", {
      sourceCityName: sourceCity.config.name,
      targetCityName: targetCity.config.name,
    });
    closeSwapDialog();
    return;
  }

  const targetOwner = players.value.find((p) => p.id === targetCity.ownerId);
  if (!targetOwner) return;

  saveStateToHistory();

  // 交换所有权
  const tempOwnerId = sourceCity.ownerId;
  sourceCity.ownerId = targetCity.ownerId;
  targetCity.ownerId = tempOwnerId;

  addLog(
    `【交换房产】玩家「${cp.name}」用「${sourceCity.config.name}」与玩家「${targetOwner.name}」的「${targetCity.config.name}」进行了交换。`,
    "teal",
  );

  persistState();
  closeSwapDialog();
}

function addCustomMoney() {
  if (gameMode.value === "multi" && customMoneyAmount.value) {
    multi.send("addCustomMoney", { amount: customMoneyAmount.value });
    return;
  }
  if (!currentPlayerId.value || !customMoneyAmount.value || isGameOver.value)
    return;
  const player = players.value.find((p) => p.id === currentPlayerId.value);
  if (!player || player.bankrupt) return;
  saveStateToHistory();
  player.cash += customMoneyAmount.value;
  addLog(
    `玩家「${player.name}」增加资金 ¥${customMoneyAmount.value.toLocaleString()}。`,
    "success",
  );
  checkBankruptcy();
  persistState();
}

function subtractCustomMoney() {
  if (gameMode.value === "multi" && customMoneyAmount.value) {
    multi.send("subtractCustomMoney", { amount: customMoneyAmount.value });
    return;
  }
  if (!currentPlayerId.value || !customMoneyAmount.value || isGameOver.value)
    return;
  const player = players.value.find((p) => p.id === currentPlayerId.value);
  if (!player || player.bankrupt) return;
  saveStateToHistory();
  player.cash -= customMoneyAmount.value;
  addLog(
    `玩家「${player.name}」减少资金 ¥${customMoneyAmount.value.toLocaleString()}。`,
    "error",
  );
  checkBankruptcy();
  persistState();
}

// 城市操作函数
function canBuyWithFee(city: CityState): boolean {
  if (isGameOver.value) return false;
  const cp = ensureCurrentPlayer();
  if (!cp) return false;
  if (!city.ownerId) return false; // 必须有人持有
  if (city.ownerId === cp.id) return false; // 不能买自己的
  if (city.isMortgaged) return false; // 抵押状态不能买
  const fee = calcSightseeingFee(city);
  return cp.cash >= fee;
}

function buyCityWithFee(city: CityState) {
  const cp = ensureCurrentPlayer();
  if (!cp) return;
  if (!canBuyWithFee(city)) return;
  if (gameMode.value === "multi") {
    multi.send("buyCityWithFee", { cityName: city.config.name });
    return;
  }
  const fee = calcSightseeingFee(city);
  const oldOwner = players.value.find((p) => p.id === city.ownerId);
  if (!oldOwner) return;

  saveStateToHistory();
  cp.cash -= fee;
  oldOwner.cash += fee;
  // 转移所有权，但保留建筑状态
  city.ownerId = cp.id;
  addLog(
    `【拿来吧你！】玩家「${cp.name}」以 ¥${fee.toLocaleString()} 从玩家「${oldOwner.name}」手中买下了「${city.config.name}」。`,
    "indigo",
  );
  checkBankruptcy();
  persistState();
}

function canDestroyBuildings(city: CityState): boolean {
  if (isGameOver.value) return false;
  if (!city.ownerId) return false; // 必须有人持有
  if (city.isMortgaged) return false; // 抵押状态不能破坏
  return city.houseCount > 0 || city.hasResort; // 必须有建筑
}

function destroyBuildings(city: CityState) {
  if (!canDestroyBuildings(city)) return;
  if (gameMode.value === "multi") {
    multi.send("destroyBuildings", { cityName: city.config.name });
    return;
  }
  const owner = players.value.find((p) => p.id === city.ownerId);
  if (!owner) return;

  saveStateToHistory();

  let msg = `【怪兽来袭】玩家「${owner.name}」的「${city.config.name}」`;
  if (city.hasResort) {
    // 有度假村，拆除度假村
    city.hasResort = false;
    msg += "度假村被摧毁了！";
  } else if (city.houseCount > 0) {
    // 没有度假村但有民宿，拆除一间民宿
    city.houseCount--;
    msg += `1 间民宿被摧毁了！（剩余 ${city.houseCount} 间）`;
  }
  addLog(msg, "red");
  persistState();
}

// 注意：移除了自动保存的watch，现在所有操作都手动调用persistState()
// 这样可以避免撤销/重做时触发不必要的保存

initFromStorage();
</script>

<style scoped>
.btn-icon {
  width: 20px;
  height: 20px;
  vertical-align: middle;
}

.fund-action-btn {
  min-height: 56px;
  height: auto;
}

.color-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
}

.city-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 10px;
}

.city-grid-item {
  padding: 10px 12px;
  border-radius: 8px;
  border-left: 4px solid;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  transition:
    box-shadow 0.2s,
    transform 0.2s;
  backdrop-filter: blur(4px);
}

.city-grid-item:hover {
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.city-table tbody tr {
  transition: background 0.2s;
}

.city-table tbody tr:hover {
  background: rgba(0, 0, 0, 0.04) !important;
}

.cursor-pointer {
  cursor: pointer;
}

.money-display {
  text-align: center;
  padding: 8px 0;
}

.player-card-current {
  border: 2px solid rgb(var(--v-theme-primary)) !important;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
}

.player-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.player-card-compact {
  min-height: auto !important;
}

.player-clickable {
  cursor: pointer;
}

.player-clickable[disabled],
.player-card-bankrupt {
  cursor: default;
}

.player-card-bankrupt {
  opacity: 0.6;
  filter: grayscale(0.5);
}

.log-virtual {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
}

.log-item {
  display: flex;
  align-items: flex-start;
  padding: 10px 12px;
  min-height: 56px; /* 与 LOG_ROW_HEIGHT 对齐 */
}
</style>
