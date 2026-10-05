package kr.nadeulirang.backend.collection;

public final class PhotoPolicy {
    private PhotoPolicy() { }

    public static String url(String value) {
        if (value == null || !value.matches("^https?://tong[.]visitkorea[.]or[.]kr/cms/resource/[0-9]+/[0-9]+_image[0-9]+_[0-9]+[.](jpg|JPG|jpeg|JPEG|png|PNG)$")) return null;
        return value.replaceFirst("^http:", "https:");
    }
}
