package kr.nadeulirang.backend.collection;

public enum Source {
    TOUR("https://apis.data.go.kr/B551011/KorService2/", "TOURAPI_SERVICE_KEY", 800,
            "https://www.data.go.kr/data/15101578/openapi.do", "TOUR_DATA"),
    FESTIVAL("https://api.data.go.kr/openapi/tn_pubr_public_cltur_fstvl_api", "FESTIVAL_SERVICE_KEY", 8000,
            "https://www.data.go.kr/data/15013104/standard.do", "KOGL1_DATA"),
    MUSEUM("https://api.data.go.kr/openapi/tn_pubr_public_museum_artgr_info_api", "MUSEUM_SERVICE_KEY", 8000,
            "https://www.data.go.kr/data/15017323/standard.do", "KOGL1_DATA");

    public final String endpoint;
    public final String keyName;
    public final int dailyBudget;
    public final String datasetUrl;
    public final String license;

    Source(String endpoint, String keyName, int dailyBudget, String datasetUrl, String license) {
        this.endpoint = endpoint;
        this.keyName = keyName;
        this.dailyBudget = dailyBudget;
        this.datasetUrl = datasetUrl;
        this.license = license;
    }
}
