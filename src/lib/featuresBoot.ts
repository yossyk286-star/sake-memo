/** 細かい設定（lib/features.ts）の保存場所。画面が出る前のスクリプトとサーバーからも使うので、hooks を持たないここに置く */
export const FEATURES_KEY = "sake-memo:features";

/** 動きの名前（CSS の html[data-fx~="…"] で使う）。設定からは外したので、いつも全部オン */
export const FX = ["listStagger", "starWave", "fabShrink", "rowCollapse", "fieldShake", "barGrow", "parallax"];

/** 画面が出る前に読む。書体・詰め具合・利き手が一瞬ちがって見えないように */
export const FEATURES_BOOT = `(function(){try{var f=JSON.parse(localStorage.getItem(${JSON.stringify(FEATURES_KEY)})||"{}");var r=document.documentElement;r.dataset.font=f.font||"gothic";r.dataset.density=f.density||"comfy";r.dataset.hand=f.hand||"right";r.dataset.fx=${JSON.stringify(FX.join(" "))};}catch(e){}})();`;
