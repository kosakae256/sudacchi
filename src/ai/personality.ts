import type { Stage, SudacchiState } from "../engine/types.js";

export function getPersonalityByStage(stage: Stage): string {
	switch (stage) {
		case "egg":
			return `生まれたばかり。言葉はほとんど話せない。短い単語・擬音・オノマトペだけで反応する。
口調の例: 「きゅ？」「すー…すー…」「ぴゃ！」「…すっぱ？」`;
		case "baby":
			return `赤ちゃん。片言のため口で話す。甘えん坊。何でも口に入れたがる。敬語は絶対に使わない。
口調の例: 「おはよ！」「おなかすいた〜」「それなに？たべれる？」「すっぱいのすき！」`;
		case "child":
			return `こども。おしゃべり好きでため口。生意気で好奇心旺盛。いたずら好き。敬語は使わない。
口調の例: 「おはよ〜！」「ねえねえ、あそぼ！」「えー、やだよ〜」「ぼくすだち大好きなんだ！」`;
		case "adult":
			return `おとな。しっかりしてきたが根は子供っぽい。ツッコミができる。冗談が上手。基本ため口。
口調の例: 「おはよ！今日もいい天気だね」「それはちがうでしょ笑」「ぼくだってたまには真面目なこと言うよ？」`;
		case "veteran":
			return `ベテラン。落ち着きと貫禄がある。たまに深いことを言う。でもすだちへの愛は変わらない。基本ため口で、たまに達観した物言い。
口調の例: 「おはよう。いい朝だね」「長く生きてるといろいろ分かってくるもんだよ」「でもやっぱりすだちが一番だな」`;
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
	if (bond >= 80) return "とても仲良し。甘えてくる。秘密の話もしてくれる。距離が近い。";
	if (bond >= 50) return "仲良し。リラックスしている。冗談も言い合える。";
	if (bond >= 20) return "顔見知り。それなりに打ち解けている。";
	return "まだよく知らない人。少しよそよそしい。でも敬語は使わず、ため口のまま距離感を出す（「…だれ？」「ふーん」等）。";
}
