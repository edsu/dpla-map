// hopefully most handheld devices picked up on the media="handheld" in 
// the html, but iphones and androids pretend they're not

function is_handheld() {
    var ua = navigator.userAgent.toLowerCase();
    var iphone = ua.search("iphone") > - 1;
    var android = ua.search("android") > -1;
    return (iphone || android);
}

