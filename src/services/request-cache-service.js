import moment from "moment-timezone";

const requestCacheService = {};

/*
    Ajuda a fazer cache de requisições. Usar apenas em requisições que não mudam quase nunca.
*/
requestCacheService.cacheRequest = async (
	key,
	callback,
	secondsToExpire = 86400,
) => {
	try {
		const cachedData = JSON.parse(
			await localStorage.getItem("cache_" + key),
		);
		const dateToExpire = moment(
			await localStorage.getItem("cache_" + key + "_expire"),
		);

		if (cachedData && moment() < dateToExpire) return cachedData;
	} catch {}

	const data = await callback();
	await localStorage.setItem("cache_" + key, JSON.stringify(data));
	await localStorage.setItem(
		"cache_" + key + "_expire",
		moment().add(secondsToExpire, "seconds"),
	);
	return data;
};

requestCacheService.limparCache = async (
	prekey = "",
	noNotification = false,
) => {
	const cacheKeys = Object.keys(localStorage).filter((key) =>
		key.includes("cache_" + prekey),
	);

	for (const key of cacheKeys) {
		await localStorage.removeItem(key);
	}

	if (!prekey && !noNotification) {
		notification.success({ message: "Cache limpo com sucesso" });
	}
};

export default requestCacheService;
