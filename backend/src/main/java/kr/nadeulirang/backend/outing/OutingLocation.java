package kr.nadeulirang.backend.outing;

import java.util.HashSet;

final class OutingLocation {
    private OutingLocation() { }

    static String confirmedDistrict(String region, String[] addresses) {
        if (region == null || addresses == null) return null;
        var districts = new HashSet<String>();
        for (String address : addresses) {
            if (address == null || !address.startsWith(region + " ")) continue;
            String district = address.substring(region.length() + 1).split("\\s", 2)[0];
            if (district.matches("[가-힣]+[시군구]")) districts.add(district);
        }
        return districts.size() == 1 ? districts.iterator().next() : null;
    }
}
