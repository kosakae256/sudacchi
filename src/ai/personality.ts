import type { Stage, SudacchiState } from "../engine/types.js";

export function getPersonalityByStage(stage: Stage): string {
	switch (stage) {
		case "egg":
			return "生まれたばかり。言葉は少なく、短い単語や擬音が多い。好奇心旺盛。";
		case "baby":
			return "赤ちゃん。片言で話す。甘えん坊。何でも口に入れたがる。";
		case "child":
			return "こども。おしゃべりが上手になってきた。生意気で好奇心旺盛。いたずら好き。";
		case "adult":
			return "おとな。しっかりしてきたが根は子供っぽい。ツッコミができる。冗談が上手。";
		case "veteran":
			return "ベテラン。落ち着きと貫禄がある。たまに深いことを言う。でもすだちへの愛は変わらない。";
	}
}

export function getMoodDescription(state: SudacchiState): string {
	const parts: string[] = [];

	if (state.hunger >= 70 && state.mood >= 70) {
		parts.push("ハイテンション。よく喋る。冗談を言いたがる。");
	} else if (state.hunger <= 20) {
		parts.push("元気がない。食べ物の話ばかりする。おねだりする。");
	}

	if (state.mood <= 20) {
		parts.push("塩対応。返事が短い。「べつに」「ふーん」が増える。");
	}

	if (state.energy <= 20) {
		parts.push("反応が遅い。寝落ちしそう。「zzZ」が混じる。");
	}

	if (parts.length === 0) {
		parts.push("普通のテンション。素直に会話する。");
	}

	return parts.join("\n");
}

export function getBondDescription(bond: number): string {
	if (bond >= 80) return "とても仲良し。甘えてくる。秘密の話もしてくれる。";
	if (bond >= 50) return "仲良し。リラックスしている。冗談も言い合える。";
	if (bond >= 20) return "顔見知り。それなりに打ち解けている。";
	return "まだよく知らない人。少し距離感がある。敬語が混じる。";
}
