import moment from "moment-timezone";

const requestCacheService = {};

// Armazena promises em andamento para evitar requests simultâneas
const pendingRequests = new Map();

/*
    Ajuda a fazer cache de requisições. Usar apenas em requisições que não mudam quase nunca.
    Evita requests simultâneas retornando a mesma promise se a request já está em andamento.
*/
requestCacheService.cacheRequest = async (
	key,
	callback,
	secondsToExpire = 86400,
) => {
	try {
		var data = JSON.parse(await localStorage.getItem("cache_" + key));
		var dateToExpire = moment(
			await localStorage.getItem("cache_" + key + "_expire"),
		);

		if (data && moment() < dateToExpire) return data;
	} catch {}

	// Se já há uma request em andamento para esta key, retorna a mesma promise
	if (pendingRequests.has(key)) {
		return pendingRequests.get(key);
	}

	// Cria a promise e armazena
	const requestPromise = (async () => {
		try {
			const data = await callback();
			await localStorage.setItem("cache_" + key, JSON.stringify(data));
			await localStorage.setItem(
				"cache_" + key + "_expire",
				moment().add(secondsToExpire, "seconds"),
			);
			return data;
		} finally {
			// Remove da lista de pendentes quando concluir
			pendingRequests.delete(key);
		}
	})();

	pendingRequests.set(key, requestPromise);
	return requestPromise;
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
