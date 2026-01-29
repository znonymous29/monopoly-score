<template>
  <v-app>
    <v-main>
      <v-container class="py-6" fluid>
        <!-- 游戏设置（仅在游戏未开始时显示） -->
        <v-card v-if="!hasActiveGame" elevation="3" class="mb-4">
          <v-card-title class="d-flex align-center justify-space-between">
            <span class="text-h6 font-weight-bold">游戏设置</span>
            <v-chip size="small" color="primary" variant="flat">
              起始资金：¥{{ START_MONEY.toLocaleString() }}
            </v-chip>
          </v-card-title>
          <v-divider />
          <v-card-text>
            <v-alert type="info" variant="tonal" class="mb-4">
              设置玩家人数、名字和颜色后，点击「开始游戏」。
            </v-alert>

            <v-switch
              v-model="hasExistingSavedGame"
              :disabled="!canLoadSavedGame"
              color="secondary"
              inset
              density="compact"
              class="mb-4"
              :label="hasExistingSavedGame ? '加载本地存档' : '重新开始新游戏'"
            />

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

            <v-btn block color="primary" class="mt-2" @click="onStartGame">
              {{
                hasExistingSavedGame && canLoadSavedGame
                  ? "加载存档"
                  : "开始游戏"
              }}
            </v-btn>
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
                游戏结束，仅剩玩家「{{ winnerPlayer.name }}」有资金，获胜！
              </v-alert>

              <!-- 撤销/重做与重新开始 -->
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
                      src="@footage/撤销.svg"
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
                      src="@footage/重做.svg"
                      alt="重做"
                      class="btn-icon mr-2"
                    />
                    重做
                  </v-btn>
                  <v-btn
                    color="error"
                    variant="outlined"
                    @click="showRestartDialog = true"
                  >
                    <img
                      src="@footage/重新开始.svg"
                      alt="重新开始"
                      class="btn-icon mr-2"
                    />
                    重新开始游戏
                  </v-btn>
                </v-card-text>
              </v-card>

              <!-- 玩家模块：点击切换当前回合玩家 -->
              <div class="mb-4">
                <div class="text-caption text-medium-emphasis mb-2">
                  点击玩家卡片切换当前回合
                </div>
                <v-slide-y-transition group>
                  <v-card
                    v-for="p in players"
                    :key="p.id"
                    class="mb-3 player-clickable"
                    :class="{
                      'player-card-current': p.id === currentPlayerId,
                      'player-card-bankrupt': p.bankrupt,
                    }"
                    variant="outlined"
                    :color="p.color"
                    :disabled="p.bankrupt"
                    @click="setCurrentPlayer(p.id)"
                  >
                    <v-card-text>
                      <div
                        class="d-flex align-center justify-space-between mb-2"
                      >
                        <div class="d-flex align-center">
                          <v-avatar size="40" class="mr-3" :color="p.color">
                            <span class="text-h6 font-weight-bold text-white">
                              {{ p.name.trim().charAt(0) || "?" }}
                            </span>
                          </v-avatar>
                          <div>
                            <div class="text-subtitle-1 font-weight-bold">
                              {{ p.name || "未命名" }}
                            </div>
                            <div class="d-flex align-center gap-2 mt-1">
                              <v-chip
                                v-if="p.bankrupt"
                                size="small"
                                color="error"
                                variant="tonal"
                              >
                                破产
                              </v-chip>
                              <v-chip
                                v-else-if="p.id === currentPlayerId"
                                size="small"
                                color="primary"
                                variant="tonal"
                              >
                                当前回合
                              </v-chip>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="money-display">
                        <div class="text-caption text-medium-emphasis mb-1">
                          现金
                        </div>
                        <div
                          class="text-h4 font-weight-bold"
                          :class="{
                            'text-success': p.cash >= START_MONEY,
                            'text-warning': p.cash >= 0 && p.cash < START_MONEY,
                            'text-error': p.cash < 0,
                          }"
                        >
                          ¥{{ p.cash.toLocaleString() }}
                        </div>
                      </div>
                    </v-card-text>
                  </v-card>
                </v-slide-y-transition>
              </div>

              <!-- 资金操作面板 -->
              <v-card elevation="3">
                <v-card-title class="d-flex align-center">
                  <v-icon icon="mdi-cash-multiple" class="mr-2" />
                  <span class="text-h6 font-weight-bold">资金操作</span>
                </v-card-title>
                <v-divider />
                <v-card-text>
                  <v-select
                    v-model="moneyOperationPlayerId"
                    :items="players"
                    item-title="name"
                    item-value="id"
                    label="选择玩家"
                    density="compact"
                    variant="outlined"
                    class="mb-3"
                    :disabled="isGameOver"
                  />

                  <v-btn
                    block
                    color="success"
                    variant="tonal"
                    class="mb-2"
                    prepend-icon="mdi-home-circle"
                    :disabled="!moneyOperationPlayerId || isGameOver"
                    @click="passStart"
                  >
                    路过起点 +¥2,000
                  </v-btn>

                  <v-btn
                    block
                    color="error"
                    variant="tonal"
                    class="mb-2"
                    prepend-icon="mdi-trending-down"
                    :disabled="!moneyOperationPlayerId || isGameOver"
                    @click="housingCrash"
                  >
                    楼市暴跌 -¥1,000
                  </v-btn>

                  <v-divider class="my-3" />

                  <v-text-field
                    v-model.number="customMoneyAmount"
                    label="自定义金额"
                    type="number"
                    density="compact"
                    variant="outlined"
                    prepend-inner-icon="mdi-cash"
                    class="mb-2"
                    :disabled="isGameOver"
                  />

                  <div class="text-caption text-medium-emphasis mb-2">
                    快速选择金额
                  </div>
                  <div class="d-flex flex-wrap gap-2 mb-3">
                    <v-btn
                      v-for="amount in [100, 200, 300, 400, 500, 600]"
                      :key="amount"
                      size="small"
                      variant="outlined"
                      :disabled="isGameOver"
                      @click="customMoneyAmount = amount"
                    >
                      ¥{{ amount.toLocaleString() }}
                    </v-btn>
                  </div>

                  <div class="d-flex flex-column gap-2">
                    <v-btn
                      block
                      color="success"
                      variant="outlined"
                      :disabled="
                        !moneyOperationPlayerId ||
                        !customMoneyAmount ||
                        isGameOver
                      "
                      @click="addCustomMoney"
                    >
                      增加
                    </v-btn>
                    <v-btn
                      block
                      color="error"
                      variant="outlined"
                      :disabled="
                        !moneyOperationPlayerId ||
                        !customMoneyAmount ||
                        isGameOver
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
                    src="@footage/记录.svg"
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
                <v-card-title class="d-flex align-center justify-space-between">
                  <div class="d-flex align-center">
                    <img
                      src="@footage/城市.svg"
                      alt="city"
                      style="width: 26px; height: 26px; margin-right: 8px"
                    />
                    <span class="text-h6 font-weight-bold">城市地产</span>
                  </div>
                  <v-chip size="small" color="primary" variant="flat">
                    点击行内按钮进行购地 / 建房 / 度假村 / 抵押 / 赎回
                  </v-chip>
                </v-card-title>
                <v-divider />
                <v-card-text>
                  <v-text-field
                    v-model="cityKeyword"
                    label="按城市名称或拼音搜索"
                    density="compact"
                    variant="outlined"
                    prepend-inner-icon="mdi-magnify"
                    class="mb-3"
                    clearable
                  />

                  <v-table density="compact" class="city-table">
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
                                src="@footage/民宿.svg"
                                alt="house"
                                style="
                                  width: 16px;
                                  height: 16px;
                                  margin-right: 2px;
                                "
                              />
                              <img
                                v-if="city.hasResort"
                                src="@footage/度假村.svg"
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
                                src="@footage/空地.svg"
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
                                src="@footage/民宿.svg"
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
                                src="@footage/度假村.svg"
                                alt="resort"
                                style="
                                  width: 16px;
                                  height: 16px;
                                  margin-right: 4px;
                                "
                              />
                              度假村
                            </v-btn>
                            <!-- 收取观光费（独立按钮） -->
                            <v-btn
                              size="x-small"
                              color="blue"
                              variant="outlined"
                              :disabled="!canCollectFee(city)"
                              @click="openCollectFeeDialog(city)"
                            >
                              <img
                                src="@footage/观光费.svg"
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
                                    src="@footage/抵押.svg"
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
                                      src="@footage/抵押.svg"
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
                                      src="@footage/赎回.svg"
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
                                    >以观光费购买</v-list-item-title
                                  >
                                </v-list-item>
                                <v-list-item
                                  :disabled="!canDestroyBuildings(city)"
                                  @click="destroyBuildings(city)"
                                >
                                  <v-list-item-title
                                    >破坏建筑</v-list-item-title
                                  >
                                </v-list-item>
                              </v-list>
                            </v-menu>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </v-table>
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
            src="@footage/价格.svg"
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
  </v-app>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from "vue";
import { CITY_CONFIGS, type CityConfig } from "./data/cities";

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
}

interface LogItem {
  message: string;
  time: string;
  color: string;
}

const LOG_ROW_HEIGHT = 56;
const LOG_VIEWPORT_HEIGHT = LOG_ROW_HEIGHT * 6;

const colorPresets = [
  "#1976D2",
  "#C2185B",
  "#00796B",
  "#F57C00",
  "#7B1FA2",
  "#455A64",
];

const playerCount = ref(4);
const editablePlayers = reactive<Player[]>(
  Array.from({ length: 6 }).map((_, idx) => ({
    id: `P${idx + 1}`,
    name: `玩家${idx + 1}`,
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

const hasExistingSavedGame = ref(false);
const canLoadSavedGame = ref(false);
const showRestartDialog = ref(false);

const cityKeyword = ref("");

// 收取观光费对话框相关
const showCollectFeeDialog = ref(false);
const selectedCityForFee = ref<CityState | null>(null);
const collectFeeVisitorId = ref<string | null>(null);

// 撤销/重做相关
const historyStack = ref<GameState[]>([]);
const historyIndex = ref(-1);

// 资金操作相关
const moneyOperationPlayerId = ref<string | null>(null);
const customMoneyAmount = ref<number | null>(null);

const hasActiveGame = computed(() => players.value.length > 0);
const currentPlayer = computed(
  () => players.value.find((p) => p.id === currentPlayerId.value) || null,
);
const bankruptPlayer = computed(
  () => players.value.find((p) => p.bankrupt) || null,
);
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

// 最新在最上（索引 0），向下滚动可查看更早的记录
const displayLogs = computed(() => [...logs.value].reverse());

const logVirtualRef = ref<any>(null);
function scrollLogsToLatest() {
  // 最新在最上 → 滚动到顶部
  const el = logVirtualRef.value?.$el as HTMLElement | undefined;
  if (!el) return;
  el.scrollTo({ top: 0, behavior: "smooth" });
}

const canUndo = computed(() => historyIndex.value > 0);
const canRedo = computed(
  () => historyIndex.value < historyStack.value.length - 1,
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
  historyIndex.value--;
  const state = historyStack.value[historyIndex.value];
  restoreGameState(state);
  addLog("已撤销上一步操作。", "warning");
}

function redo() {
  if (!canRedo.value) return;
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
    canLoadSavedGame.value = true;
    hasExistingSavedGame.value = true;
    restoreGameState(saved);
    // 初始化历史栈，将当前状态作为第一个历史记录
    historyStack.value = [snapshotGameState()];
    historyIndex.value = 0;
  } else {
    canLoadSavedGame.value = false;
    hasExistingSavedGame.value = false;
    // 不自动开始游戏，等待用户点击开始
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
  persistState();
}

function onStartGame() {
  if (hasExistingSavedGame.value && canLoadSavedGame.value) {
    const saved = loadStateFromStorage();
    if (saved) {
      restoreGameState(saved);
      // 初始化历史栈
      historyStack.value = [snapshotGameState()];
      historyIndex.value = 0;
      addLog("已从本地存档加载游戏进度。", "primary");
      persistState();
      return;
    }
  }
  startNewGameFromEditable();
  addLog("已根据当前设置重新开始新游戏。", "primary");
}

function addLog(message: string, color: string = "primary") {
  logs.value.push({
    message,
    color,
    time: new Date().toLocaleTimeString(),
  });
  void nextTick(() => scrollLogsToLatest());
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

function ensureCurrentPlayer(): Player | null {
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
  const cp = ensureCurrentPlayer();
  if (!cp) return;
  if (!canBuyLand(city)) return;
  saveStateToHistory();
  cp.cash -= city.config.landPrice;
  city.ownerId = cp.id;
  addLog(
    `玩家「${cp.name}」以 ¥${city.config.landPrice.toLocaleString()} 购买了「${city.config.name}」空地。`,
    "primary",
  );
  checkBankruptcy();
  persistState();
}

function buildHouse(city: CityState) {
  const cp = ensureCurrentPlayer();
  if (!cp) return;
  if (!canBuildHouse(city)) return;
  saveStateToHistory();
  cp.cash -= city.config.housePrice;
  city.houseCount += 1;
  addLog(
    `玩家「${cp.name}」在「${city.config.name}」新建 1 间民宿（当前共 ${city.houseCount} 间），花费 ¥${city.config.housePrice.toLocaleString()}。`,
    "green",
  );
  checkBankruptcy();
  persistState();
}

function buildResort(city: CityState) {
  const cp = ensureCurrentPlayer();
  if (!cp) return;
  if (!canBuildResort(city)) return;
  saveStateToHistory();
  cp.cash -= city.config.resortPrice;
  city.hasResort = true;
  addLog(
    `玩家「${cp.name}」在「${city.config.name}」建成度假村，花费 ¥${city.config.resortPrice.toLocaleString()}。`,
    "deep-purple",
  );
  checkBankruptcy();
  persistState();
}

function mortgageCity(city: CityState) {
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
  players.value = [];
  cities.value = [];
  currentPlayerId.value = null;
  isGameOver.value = false;
  historyStack.value = [];
  historyIndex.value = -1;
  logs.value = [];
  localStorage.removeItem(STORAGE_KEY);
  canLoadSavedGame.value = false;
  hasExistingSavedGame.value = false;
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
  if (!visitor || visitor.bankrupt) return false;
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

function openCollectFeeDialog(city: CityState) {
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

function confirmCollectFee() {
  if (!canConfirmCollectFee.value || !selectedCityForFee.value) return;
  const city = selectedCityForFee.value;
  if (!city.ownerId) return;
  const owner = players.value.find((p) => p.id === city.ownerId);
  const visitor = players.value.find((p) => p.id === collectFeeVisitorId.value);
  if (!owner || !visitor || owner.id === visitor.id) return;

  const fee = collectFeeAmount.value;
  if (fee <= 0) return;

  saveStateToHistory();
  visitor.cash -= fee;
  owner.cash += fee;
  addLog(
    `玩家「${visitor.name}」在「${city.config.name}」支付观光费 ¥${fee.toLocaleString()} 给玩家「${owner.name}」。`,
    "primary",
  );
  checkBankruptcy();
  persistState();
  showCollectFeeDialog.value = false;
  selectedCityForFee.value = null;
  collectFeeVisitorId.value = null;
}

// 资金操作函数
function passStart() {
  if (!moneyOperationPlayerId.value || isGameOver.value) return;
  const player = players.value.find(
    (p) => p.id === moneyOperationPlayerId.value,
  );
  if (!player || player.bankrupt) return;
  saveStateToHistory();
  player.cash += 2000;
  addLog(`玩家「${player.name}」路过起点，获得 ¥2,000。`, "success");
  checkBankruptcy();
  persistState();
}

function housingCrash() {
  if (!moneyOperationPlayerId.value || isGameOver.value) return;
  const player = players.value.find(
    (p) => p.id === moneyOperationPlayerId.value,
  );
  if (!player || player.bankrupt) return;
  saveStateToHistory();
  player.cash -= 1000;
  addLog(`玩家「${player.name}」遭遇楼市暴跌，损失 ¥1,000。`, "error");
  checkBankruptcy();
  persistState();
}

function addCustomMoney() {
  if (
    !moneyOperationPlayerId.value ||
    !customMoneyAmount.value ||
    isGameOver.value
  )
    return;
  const player = players.value.find(
    (p) => p.id === moneyOperationPlayerId.value,
  );
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
  if (
    !moneyOperationPlayerId.value ||
    !customMoneyAmount.value ||
    isGameOver.value
  )
    return;
  const player = players.value.find(
    (p) => p.id === moneyOperationPlayerId.value,
  );
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
  const fee = calcSightseeingFee(city);
  const oldOwner = players.value.find((p) => p.id === city.ownerId);
  if (!oldOwner) return;

  saveStateToHistory();
  cp.cash -= fee;
  oldOwner.cash += fee;
  // 转移所有权，但保留建筑状态
  city.ownerId = cp.id;
  addLog(
    `玩家「${cp.name}」以观光费 ¥${fee.toLocaleString()} 的价格从玩家「${oldOwner.name}」手中买下了「${city.config.name}」。`,
    "indigo",
  );
  checkBankruptcy();
  persistState();
}

function canDestroyBuildings(city: CityState): boolean {
  if (isGameOver.value) return false;
  const cp = ensureCurrentPlayer();
  if (!cp) return false;
  if (!city.ownerId || city.ownerId !== cp.id) return false; // 必须是自己的
  if (city.isMortgaged) return false; // 抵押状态不能破坏
  return city.houseCount > 0 || city.hasResort; // 必须有建筑
}

function destroyBuildings(city: CityState) {
  const cp = ensureCurrentPlayer();
  if (!cp) return;
  if (!canDestroyBuildings(city)) return;

  saveStateToHistory();
  const hadResort = city.hasResort;
  const houseCount = city.houseCount;
  city.hasResort = false;
  city.houseCount = 0;

  let msg = `玩家「${cp.name}」破坏了「${city.config.name}」的`;
  if (hadResort) {
    msg += "度假村";
    if (houseCount > 0) msg += `和 ${houseCount} 间民宿`;
  } else {
    msg += `${houseCount} 间民宿`;
  }
  msg += "。";
  addLog(msg, "red");
  persistState();
}

// 初始化时设置当前玩家ID到资金操作选择器
watch(
  currentPlayerId,
  (newId) => {
    if (newId && hasActiveGame.value) {
      moneyOperationPlayerId.value = newId;
    }
  },
  { immediate: true },
);

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

.color-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
}

.city-table tbody tr:nth-child(even) {
  background-color: rgba(0, 0, 0, 0.01);
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
