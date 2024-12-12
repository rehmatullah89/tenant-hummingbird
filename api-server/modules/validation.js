var mimes = {
    image: [
        'image/bmp',
        'image/prs.btif',
        'image/gif',
        'image/x-icon',
        'image/ief',
        'image/jpeg',
        'image/vnd.ms-modi',
        'image/x-pict',
        'image/x-portable-anymap',
        'image/x-portable-bitmap',
        'image/x-portable-graymap',
        'image/png',
        'image/x-portable-pixmap',
        'image/svg+xml',
        'image/x-rgb',
        'image/tiff',
        'image/vnd.wap.wbmp',
        'image/webp',
        'image/x-xbitmap',
        'image/x-xwindowdump'
    ],
    files: [
        //pdf
        'application/pdf',

        //word
        'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

        //excel
        'application/vnd.ms-excel',
        'application/vnd.ms-excel.addin.macroenabled.12',
        'application/vnd.ms-excel.sheet.binary.macroenabled.12',
        'application/vnd.ms-excel.template.macroenabled.12',
        'application/vnd.ms-excel.sheet.macroenabled.12',

        //text
        'text/csv',
        'text/html',
        'application/vnd.oasis.opendocument.text-web',
        'application/vnd.oasis.opendocument.text',
        'application/vnd.oasis.opendocument.text-master',
        'application/vnd.oasis.opendocument.text-template',
        'application/vnd.sun.xml.writer',
        'application/vnd.sun.xml.writer.global',
        'application/vnd.sun.xml.writer.template',
        'application/rtf',
        'text/richtext',
        'text/x-setext',
        'text/tab-separated-values',
        'application/tei+xml',
        'text/plain',
        'text/yaml'
    ],
    document: [
        //pdf
        'application/pdf',
    ]
};



module.exports = {
    validateEmail: function(email){
        var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    },
    validatePhone: function(phone){
        phone.replace("[^\d+!x]", "");
        return (phone.length < 10) ? false: phone.replace("[^\d+!x]", "");
    },
    validateZip: function(zip){
        zip.replace("[^\d]", "");
        return (zip.length < 5) ? false: zip;
    },
    slugify: function(text){
        return text.toString().toLowerCase()
            .replace(/\s+/g, '-')           // Replace spaces with -
            .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
            .replace(/\-\-+/g, '-')         // Replace multiple - with single -
            .replace(/^-+/, '')             // Trim - from start of text
            .replace(/-+$/, '');            // Trim - from end of text
    },
    nl2br: function(str, is_xhtml){
        var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';
        return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
    },
    capitalizeFirst: function(str){
        return str.charAt(0).toUpperCase() + str.slice(1);
    },
    capitalizeAll: function(str){
        return str.replace(/(^|\s)[a-z]/g, function(f){ return f.toUpperCase(); });
    },
    validateUpload: function(type, mime) {
        if (type == 'all') {
            return mimes['image'].indexOf(mime) || mimes['files'].indexOf(mime);
        }
	    console.log("MIME INDEX",mimes[type].indexOf(mime) >= 0);
        return mimes[type].indexOf(mime) >= 0;
    }

};


