/** 与前端 src/data/cities.ts 保持一致的配置 */
export interface CityConfig {
  name: string;
  color: string;
  landPrice: number;
  mortgagePrice: number;
  redeemPrice: number;
  housePrice: number;
  resortPrice: number;
  baseFee: number;
  house1Fee: number;
  house2Fee: number;
  house3Fee: number;
  resortFee: number;
}

export const CITY_CONFIG_MAP: Record<string, CityConfig> = {
  南昌: { name: "南昌", color: "#207735", landPrice: 1800, mortgagePrice: 1080, redeemPrice: 1260, housePrice: 1000, resortPrice: 1000, baseFee: 140, house1Fee: 750, house2Fee: 2300, house3Fee: 6000, resortFee: 8500 },
  呼和浩特: { name: "呼和浩特", color: "#207735", landPrice: 2000, mortgagePrice: 1180, redeemPrice: 1520, housePrice: 1500, resortPrice: 1500, baseFee: 160, house1Fee: 750, house2Fee: 2150, house3Fee: 6080, resortFee: 8000 },
  南京: { name: "南京", color: "#502F6B", landPrice: 3000, mortgagePrice: 1800, redeemPrice: 2100, housePrice: 2000, resortPrice: 2000, baseFee: 260, house1Fee: 1300, house2Fee: 3900, house3Fee: 9000, resortFee: 12750 },
  敦煌: { name: "敦煌", color: "#502F6B", landPrice: 1000, mortgagePrice: 600, redeemPrice: 700, housePrice: 500, resortPrice: 500, baseFee: 60, house1Fee: 300, house2Fee: 900, house3Fee: 2700, resortFee: 5500 },
  北京: { name: "北京", color: "#502F6B", landPrice: 2600, mortgagePrice: 1560, redeemPrice: 1820, housePrice: 1500, resortPrice: 1500, baseFee: 220, house1Fee: 1100, house2Fee: 3300, house3Fee: 8000, resortFee: 11500 },
  天津: { name: "天津", color: "#943673", landPrice: 2600, mortgagePrice: 1560, redeemPrice: 1820, housePrice: 1500, resortPrice: 1500, baseFee: 220, house1Fee: 1100, house2Fee: 3300, house3Fee: 8000, resortFee: 11500 },
  哈尔滨: { name: "哈尔滨", color: "#943673", landPrice: 2800, mortgagePrice: 1680, redeemPrice: 1960, housePrice: 1500, resortPrice: 1500, baseFee: 240, house1Fee: 1200, house2Fee: 3600, house3Fee: 8500, resortFee: 12000 },
  上海: { name: "上海", color: "#C51B25", landPrice: 3000, mortgagePrice: 1800, redeemPrice: 2100, housePrice: 2000, resortPrice: 2000, baseFee: 260, house1Fee: 1300, house2Fee: 3900, house3Fee: 9000, resortFee: 12750 },
  西安: { name: "西安", color: "#C51B25", landPrice: 2000, mortgagePrice: 1200, redeemPrice: 1400, housePrice: 1000, resortPrice: 1000, baseFee: 160, house1Fee: 800, house2Fee: 2200, house3Fee: 6000, resortFee: 8000 },
  青岛: { name: "青岛", color: "#207735", landPrice: 2400, mortgagePrice: 1440, redeemPrice: 1680, housePrice: 1500, resortPrice: 1500, baseFee: 200, house1Fee: 1000, house2Fee: 3000, house3Fee: 7500, resortFee: 11000 },
  长沙: { name: "长沙", color: "#207735", landPrice: 2200, mortgagePrice: 1320, redeemPrice: 1540, housePrice: 1500, resortPrice: 1500, baseFee: 180, house1Fee: 900, house2Fee: 2500, house3Fee: 7000, resortFee: 10500 },
  桂林: { name: "桂林", color: "#0C416D", landPrice: 2200, mortgagePrice: 1320, redeemPrice: 1540, housePrice: 1500, resortPrice: 1500, baseFee: 180, house1Fee: 900, house2Fee: 2500, house3Fee: 7000, resortFee: 10500 },
  杭州: { name: "杭州", color: "#207735", landPrice: 3200, mortgagePrice: 1920, redeemPrice: 2240, housePrice: 2000, resortPrice: 2000, baseFee: 280, house1Fee: 1500, house2Fee: 4500, house3Fee: 10000, resortFee: 14000 },
  武汉: { name: "武汉", color: "#207735", landPrice: 2200, mortgagePrice: 1320, redeemPrice: 1540, housePrice: 1500, resortPrice: 1500, baseFee: 180, house1Fee: 900, house2Fee: 2500, house3Fee: 7000, resortFee: 10500 },
  重庆: { name: "重庆", color: "#207735", landPrice: 1800, mortgagePrice: 1080, redeemPrice: 1260, housePrice: 1000, resortPrice: 1000, baseFee: 140, house1Fee: 700, house2Fee: 2000, house3Fee: 5500, resortFee: 9500 },
  成都: { name: "成都", color: "#C14D90", landPrice: 2800, mortgagePrice: 1680, redeemPrice: 1960, housePrice: 1500, resortPrice: 1500, baseFee: 240, house1Fee: 1200, house2Fee: 3600, house3Fee: 8500, resortFee: 12000 },
  乌鲁木齐: { name: "乌鲁木齐", color: "#C14D90", landPrice: 1600, mortgagePrice: 1080, redeemPrice: 1260, housePrice: 1000, resortPrice: 1000, baseFee: 120, house1Fee: 700, house2Fee: 2000, house3Fee: 5500, resortFee: 9500 },
  拉萨: { name: "拉萨", color: "#C14D90", landPrice: 1400, mortgagePrice: 840, redeemPrice: 980, housePrice: 1000, resortPrice: 1000, baseFee: 100, house1Fee: 500, house2Fee: 1500, house3Fee: 4500, resortFee: 7500 },
  大理: { name: "大理", color: "#0C416D", landPrice: 3200, mortgagePrice: 1560, redeemPrice: 1820, housePrice: 1500, resortPrice: 1500, baseFee: 220, house1Fee: 1100, house2Fee: 3300, house3Fee: 8000, resortFee: 11500 },
  三亚: { name: "三亚", color: "#0C416D", landPrice: 3500, mortgagePrice: 2100, redeemPrice: 2450, housePrice: 2000, resortPrice: 2000, baseFee: 350, house1Fee: 1750, house2Fee: 5000, house3Fee: 11000, resortFee: 15000 },
  台北: { name: "台北", color: "#C51B25", landPrice: 4000, mortgagePrice: 2400, redeemPrice: 2800, housePrice: 2000, resortPrice: 2000, baseFee: 500, house1Fee: 2000, house2Fee: 6000, house3Fee: 14000, resortFee: 20000 },
  香港: { name: "香港", color: "#C51B25", landPrice: 3000, mortgagePrice: 1880, redeemPrice: 2450, housePrice: 2250, resortPrice: 2250, baseFee: 200, house1Fee: 1000, house2Fee: 3000, house3Fee: 9000, resortFee: 12500 },
  厦门: { name: "厦门", color: "#E3AC41", landPrice: 3500, mortgagePrice: 2100, redeemPrice: 2450, housePrice: 2000, resortPrice: 2000, baseFee: 350, house1Fee: 1750, house2Fee: 5000, house3Fee: 11000, resortFee: 15000 },
  深圳: { name: "深圳", color: "#E3AC41", landPrice: 3200, mortgagePrice: 1920, redeemPrice: 2240, housePrice: 2000, resortPrice: 2000, baseFee: 280, house1Fee: 1500, house2Fee: 4500, house3Fee: 10000, resortFee: 14000 },
  广州: { name: "广州", color: "#E3AC41", landPrice: 2600, mortgagePrice: 1560, redeemPrice: 1820, housePrice: 500, resortPrice: 500, baseFee: 220, house1Fee: 1100, house2Fee: 3300, house3Fee: 8000, resortFee: 11500 },
  澳门: { name: "澳门", color: "#E3AC41", landPrice: 2800, mortgagePrice: 1700, redeemPrice: 2000, housePrice: 500, resortPrice: 500, baseFee: 240, house1Fee: 1200, house2Fee: 3600, house3Fee: 8500, resortFee: 12000 },
};
