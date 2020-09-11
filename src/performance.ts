'use strict';

const fetch = require('node-fetch');

class PerformanceComparision
{
    batchSize = 10;

    fetchBatchVulnerabilities = async (reqData) => {
        try {
            let url = "https://f8a-analytics-preview-2445582058137.staging.gw.apicast.io/api/v2/component-analyses/?user_key=3e42fa66f65124e6b1266a23431e3d08";

            const headers = {
                'Content-Type': 'application/json',
                'uuid': "94991193-4ca0-47ef-9637-729ea68a85de",
            };
            return fetch(url , {
                method: 'post',
                body:    JSON.stringify(reqData),
                headers: headers,
            });
        } catch(err) {
            alert(err);
        }
    };

    getVulnerabilities = async (ecosystem, name, version) => {
        try {
            const part = [ecosystem, name, version].map(v => encodeURIComponent(v)).join('/');
            let getUrl = "https://f8a-analytics-preview-2445582058137.staging.gw.apicast.io/api/v2/component-analyses/" + part + "?user_key=3e42fa66f65124e6b1266a23431e3d08";

            return fetch(getUrl);
        } catch(err) {
            alert(err);
        }
    };

    getBatchTime = async (ecosystem, payload) => {
        let reqData = [];
        for (let i = 0; i < payload.length; i += this.batchSize) {
            reqData.push({
                "ecosystem": ecosystem,
                "package_versions": payload.slice(i, i + this.batchSize)
            });
        }
        let batchStart = new Date().getTime();
        const allRequests = reqData.map(request => this.fetchBatchVulnerabilities(request));
        await Promise.allSettled(allRequests).then(() => {
            let batchEnd = new Date().getTime();
            let batchTime = batchEnd - batchStart;
            console.log("\n Time taken for " + payload.length + " depensencies: [Batch call time = " + batchTime + " ms]");
        });
    }

    getTime = async (ecosystem, payload) => {
        let getStart = new Date().getTime();
        const allRequests = payload.map(pack => this.getVulnerabilities(ecosystem, pack.package, pack.version));
        await Promise.allSettled(allRequests).then(() => {
            let getEnd = new Date().getTime();
            let gTime = getEnd - getStart;
            console.log("\n Time taken for " + payload.length + " depensencies: [Normal call time = " + gTime + " ms]");
        });
    }

    performanceTest = async (ecosystem, payload) => {
        const iterationCount = 10;
        for (let i = 0; i < iterationCount; i++) {
            console.log("\n iteration count:" + (i+1));
            await this.getTime(ecosystem, payload);
            setTimeout(() => {}, 2000);
            await this.getBatchTime(ecosystem, payload);
            setTimeout(() => {}, 2000);
        }
    }
}

async function runPerformance() {

    let perf = new PerformanceComparision;

    console.log("\n\n Comparision for 6 Dependencies: \n");
    let payload6npm = [{"package":"lodash","version":"4.17.4"},{"package":"mongoose","version":"4.8.6"},{"package":"express-fileupload","version":"0.0.5"},{"package":"dustjs-linkedin","version":"2.5.0"},{"package":"adm-zip","version":"0.4.16"},{"package":"st","version":"2.0.0"}];
    await perf.performanceTest("npm", payload6npm);
    setTimeout(() => {}, 2000);

    console.log("\n\n Comparision for 7 Dependencies: \n");
    let payload7 = [{"package":"boto3","version":"1.7.8"},{"package":"botocore","version":"1.10.8"},{"package":"docutils","version":"0.14"},{"package":"jmespath","version":"0.9.3"},{"package":"python-dateutil","version":"2.7.2"},{"package":"s3transfer","version":"0.1.13"},{"package":"six","version":"1.11.0"}];
    await perf.performanceTest("pypi", payload7);
    setTimeout(() => {}, 2000);

    console.log("\n\n Comparision for 17 Dependencies: \n");
    let payload17 = [{"package":"aniso8601","version":"8.0.0"},{"package":"attrs","version":"19.3.0"},{"package":"babel","version":"2.8.0"},{"package":"blinker","version":"1.4"},{"package":"boto3","version":"1.10.47"},{"package":"botocore","version":"1.13.47"},{"package":"certifi","version":"2019.11.28"},{"package":"chardet","version":"3.0.4"},{"package":"click","version":"7.0"},{"package":"colorama","version":"0.4.3"},{"package":"coverage","version":"5.0.2"},{"package":"cython","version":"0.29.14"},{"package":"docutils","version":"0.15.2"},{"package":"entrypoints","version":"0.3"},{"package":"flake8-polyfill","version":"1.0.2"},{"package":"flake8","version":"3.7.9"},{"package":"flask-babelex","version":"0.9.3"}];
    await perf.performanceTest("pypi", payload17);
    setTimeout(() => {}, 2000);

    console.log("\n\n Comparision for 19 Dependencies: \n");
    let payload19 = [{"package":"click","version":"7.0"},{"package":"codecov","version":"2.0.15"},{"package":"daiquiri","version":"1.5.0"},{"package":"flask","version":"1.0.2"},{"package":"gevent","version":"1.3.7"},{"package":"greenlet","version":"0.4.15"},{"package":"gunicorn","version":"19.9.0"},{"package":"itsdangerous","version":"1.1.0"},{"package":"jinja2","version":"2.10.3"},{"package":"markupsafe","version":"1.1.0"},{"package":"numpy","version":"1.17.4"},{"package":"pandas","version":"0.23.4"},{"package":"python-dateutil","version":"2.7.5"},{"package":"pytz","version":"2018.7"},{"package":"six","version":"1.11.0"},{"package":"werkzeug","version":"0.16.0"},{"package":"raven[flask]","version":"6.10.0"},{"package":"contextlib2","version":"0.5.5"},{"package":"blinker","version":"1.4"}];
    await perf.performanceTest("pypi", payload19);
    setTimeout(() => {}, 2000);

    console.log("\n\n Comparision for 20 Dependencies: \n");
    let payload20npm = [{"package":"adm-zip","version":"0.4.7"},{"package":"body-parser","version":"1.9.0"},{"package":"consolidate","version":"0.14.5"},{"package":"cookie-parser","version":"1.3.3"},{"package":"dustjs-helpers","version":"1.5.0"},{"package":"dustjs-linkedin","version":"2.5.0"},{"package":"ejs","version":"1.0.0"},{"package":"ejs-locals","version":"1.0.2"},{"package":"errorhandler","version":"1.2.0"},{"package":"express","version":"4.12.4"},{"package":"express-fileupload","version":"0.0.5"},{"package":"humanize-ms","version":"1.0.1"},{"package":"lodash","version":"4.17.4"},{"package":"marked","version":"0.3.5"},{"package":"method-override","version":"latest"},{"package":"moment","version":"2.15.1"},{"package":"mongoose","version":"4.2.4"},{"package":"morgan","version":"latest"},{"package":"npmconf","version":"0.0.24"},{"package":"st","version":"0.2.4"}];
    await perf.performanceTest("npm", payload20npm);
    setTimeout(() => {}, 2000);

    console.log("\n\n Comparision for 23 Dependencies: \n");
    let payload23 = [{"package":"boto3","version":"1.6.7"},{"package":"botocore","version":"1.9.23"},{"package":"click","version":"6.7"},{"package":"daiquiri","version":"1.3.0"},{"package":"docutils","version":"0.14"},{"package":"flask","version":"1.0.2"},{"package":"gevent","version":"1.2.2"},{"package":"greenlet","version":"0.4.14"},{"package":"gunicorn","version":"19.7.1"},{"package":"itsdangerous","version":"0.24"},{"package":"jinja2","version":"2.10.1"},{"package":"jmespath","version":"0.9.3"},{"package":"markupsafe","version":"1.0"},{"package":"numpy","version":"1.14.2"},{"package":"python-dateutil","version":"2.6.1"},{"package":"s3transfer","version":"0.1.13"},{"package":"scipy","version":"1.0.0"},{"package":"six","version":"1.11.0"},{"package":"werkzeug","version":"0.15.3"},{"package":"raven[flask]","version":"6.10.0"},{"package":"contextlib2","version":"0.5.5"},{"package":"blinker","version":"1.4"},{"package":"django","version":"1.1"}];
    await perf.performanceTest("pypi", payload23);
    setTimeout(() => {}, 2000);

    console.log("\n\n Comparision for 26 Dependencies: \n");
    let paylaod26pom = [{"package":"com.sun.activation:javax.activation","version":"1.2.0"},{"package":"com.google.protobuf:protobuf-java","version":"2.6.1"},{"package":"org.bouncycastle:bcpkix-jdk15on","version":"1.65"},{"package":"org.bouncycastle:bcprov-jdk15on","version":"1.54"},{"package":"com.fasterxml:aalto-xml","version":"1.0.0"},{"package":"com.jcraft:jzlib","version":"1.1.3"},{"package":"com.ning:compress-lzf","version":"1.0.3"},{"package":"net.jpountz.lz4:lz4","version":"1.3.0"},{"package":"com.github.jponge:lzma-java","version":"1.3"},{"package":"org.jctools:jctools-core","version":"3.0.0"},{"package":"org.rxtx:rxtx","version":"2.1.7"},{"package":"com.barchart.udt:barchart-udt-bundle","version":"2.3.0"},{"package":"javax.servlet:servlet-api","version":"2.5"},{"package":"org.slf4j:slf4j-api","version":"1.7.21"},{"package":"commons-logging:commons-logging","version":"1.2"},{"package":"log4j:log4j","version":"1.2.17"},{"package":"com.yammer.metrics:metrics-core","version":"2.2.0"},{"package":"org.tukaani:xz","version":"1.5"},{"package":"io.projectreactor.tools:blockhound","version":"1.0.3.RELEASE"},{"package":"com.puppycrawl.tools:checkstyle","version":"8.29"},{"package":"org.apache.maven.scm:maven-scm-api","version":"1.9.4"},{"package":"org.apache.maven.scm:maven-scm-provider-gitexe","version":"1.9.4"},{"package":"org.apache.ant:ant","version":"1.9.7"},{"package":"org.apache.ant:ant-launcher","version":"1.9.7"},{"package":"ant-contrib:ant-contrib","version":"1.0b3"},{"package":"ant-contrib:ant-contrib","version":"1.0b3"}];
    await perf.performanceTest("maven", paylaod26pom);
    setTimeout(() => {}, 2000);

    console.log("\n\n Comparision for 29 Dependencies: \n");
    let payload29 = [{"package":"certifi","version":"2018.4.16"},{"package":"chardet","version":"3.0.4"},{"package":"click","version":"6.7"},{"package":"codecov","version":"2.0.15"},{"package":"flask-cors","version":"3.0.2"},{"package":"flask","version":"1.1.1"},{"package":"gevent","version":"1.2.2"},{"package":"greenlet","version":"0.4.13"},{"package":"gunicorn","version":"19.7.1"},{"package":"idna","version":"2.6"},{"package":"itsdangerous","version":"0.24"},{"package":"jinja2","version":"2.10.3"},{"package":"markupsafe","version":"1.0"},{"package":"psycopg2","version":"2.7.7"},{"package":"requests-futures","version":"0.9.7"},{"package":"requests","version":"2.22.0"},{"package":"semantic-version","version":"2.6.0"},{"package":"six","version":"1.11.0"},{"package":"sqlalchemy","version":"1.3.12"},{"package":"urllib3","version":"1.25.7"},{"package":"werkzeug","version":"0.16.0"},{"package":"raven[flask]","version":"6.10.0"},{"package":"contextlib2","version":"0.5.5"},{"package":"blinker","version":"1.4"},{"package":"flask","version":"0.12"},{"package":"markdown2","version":"2.2.0"},{"package":"jinja2","version":"2.7.2"},{"package":"passlib","version":"1.7.1"},{"package":"urllib3","version":"1.24.1"}];
    await perf.performanceTest("pypi", payload29);
    setTimeout(() => {}, 2000);

    console.log("\n\n Comparision for 35 Dependencies: \n");
    let payload35 = [{"package":"bleach","version":"1.5.0"},{"package":"certifi","version":"2018.8.13"},{"package":"chardet","version":"3.0.4"},{"package":"click","version":"6.7"},{"package":"clickclick","version":"1.2.2"},{"package":"connexion","version":"1.5.2"},{"package":"edward","version":"1.3.5"},{"package":"enum34","version":"1.1.6"},{"package":"flask-cors","version":"3.0.6"},{"package":"flask","version":"1.0.2"},{"package":"gunicorn","version":"19.9.0"},{"package":"html5lib","version":"0.9999999"},{"package":"idna","version":"2.7"},{"package":"inflection","version":"0.3.1"},{"package":"itsdangerous","version":"0.24"},{"package":"jinja2","version":"2.10"},{"package":"jsonschema","version":"2.6.0"},{"package":"markdown","version":"2.6.11"},{"package":"markupsafe","version":"1.0"},{"package":"numpy","version":"1.15.0"},{"package":"pandas","version":"0.23.2"},{"package":"protobuf","version":"3.6.1"},{"package":"python-dateutil","version":"2.7.3"},{"package":"pyyaml","version":"3.13"},{"package":"requests","version":"2.19.1"},{"package":"scipy","version":"1.1.0"},{"package":"six","version":"1.11.0"},{"package":"swagger-spec-validator","version":"2.3.1"},{"package":"urllib3","version":"1.23"},{"package":"werkzeug","version":"0.14.1"},{"package":"wheel","version":"0.31.1"},{"package":"raven[flask]","version":"6.10.0"},{"package":"contextlib2","version":"0.5.5"},{"package":"blinker","version":"1.4"}];
    await perf.performanceTest("pypi", payload35);
    setTimeout(() => {}, 2000);

    console.log("\n\n Comparision for 44 Dependencies: \n");
    let payload44 = [{"package":"atomicwrites","version":"1.2.1"},{"package":"attrs","version":"18.2.0"},{"package":"boto3","version":"1.9.99"},{"package":"botocore","version":"1.12.99"},{"package":"certifi","version":"2018.8.24"},{"package":"chardet","version":"3.0.4"},{"package":"click","version":"7.0"},{"package":"codecov","version":"2.0.15"},{"package":"colorama","version":"0.4.1"},{"package":"coverage","version":"4.5.1"},{"package":"docutils","version":"0.14"},{"package":"flake8-polyfill","version":"1.0.2"},{"package":"flake8","version":"3.5.0"},{"package":"flask-cors","version":"3.0.6"},{"package":"flask","version":"1.0.2"},{"package":"gevent","version":"1.3.6"},{"package":"greenlet","version":"0.4.15"},{"package":"gunicorn","version":"19.9.0"},{"package":"idna","version":"2.7"},{"package":"itsdangerous","version":"0.24"},{"package":"jinja2","version":"2.10"},{"package":"jmespath","version":"0.9.3"},{"package":"mando","version":"0.6.4"},{"package":"markupsafe","version":"1.0"},{"package":"mccabe","version":"0.6.1"},{"package":"more-itertools","version":"4.3.0"},{"package":"pluggy","version":"0.7.1"},{"package":"psycopg2","version":"2.7.7"},{"package":"py","version":"1.6.0"},{"package":"pycodestyle","version":"2.3.1"},{"package":"pyflakes","version":"1.6.0"},{"package":"pytest-cov","version":"2.6.0"},{"package":"pytest-mock","version":"1.10.0"},{"package":"pytest","version":"3.8.1"},{"package":"python-dateutil","version":"2.8.0"},{"package":"radon","version":"3.0.1"},{"package":"requests-futures","version":"1.0.0"},{"package":"requests","version":"2.19.1"},{"package":"s3transfer","version":"0.2.0"},{"package":"sentry-sdk","version":"0.7.2"},{"package":"six","version":"1.11.0"},{"package":"sqlalchemy","version":"1.2.12"},{"package":"urllib3","version":"1.23"},{"package":"werkzeug","version":"0.14.1"}];
    await perf.performanceTest("pypi", payload44);
    setTimeout(() => {}, 2000);

    console.log("\n\n Comparision for 47 Dependencies: \n");
    let payload47 = [{"package":"argcomplete","version":"1.11.1"},{"package":"asn1crypto","version":"1.3.0"},{"package":"attrs","version":"19.3.0"},{"package":"beautifulsoup4","version":"4.4.1"},{"package":"certifi","version":"2019.11.28"},{"package":"cffi","version":"1.14.0"},{"package":"chardet","version":"3.0.4"},{"package":"codecov","version":"2.0.15"},{"package":"coloredlogs","version":"10.0"},{"package":"cryptography","version":"2.2.2"},{"package":"docker","version":"4.2.0"},{"package":"dxpy","version":"0.290.1"},{"package":"flask","version":"1.1.2"},{"package":"gunicorn","version":"20.0.4"},{"package":"humanfriendly","version":"6.0"},{"package":"idna","version":"2.8"},{"package":"importlib-metadata","version":"1.5.0"},{"package":"lark-parser","version":"0.8.1"},{"package":"markdown2","version":"2.2.0"},{"package":"jinja2","version":"2.7.2"},{"package":"miniwdl","version":"0.7.0"},{"package":"more-itertools","version":"8.2.0"},{"package":"passlib","version":"1.7.0"},{"package":"packaging","version":"20.1"},{"package":"pluggy","version":"0.13.1"},{"package":"pokrok","version":"0.2.0"},{"package":"psutil","version":"5.6.7"},{"package":"py","version":"1.8.1"},{"package":"pycparser","version":"2.19"},{"package":"pygtail","version":"0.11.1"},{"package":"pyparsing","version":"2.4.6"},{"package":"pysam","version":"0.15.4"},{"package":"pytest","version":"5.3.5"},{"package":"pytest-subtests","version":"0.3.0"},{"package":"python-dateutil","version":"2.8.1"},{"package":"python-magic","version":"0.4.6"},{"package":"regex","version":"2020.1.8"},{"package":"requests","version":"2.22.0"},{"package":"six","version":"1.14.0"},{"package":"subby","version":"0.1.7"},{"package":"tqdm","version":"4.42.1"},{"package":"urllib3","version":"1.24.1"},{"package":"wcwidth","version":"0.1.8"},{"package":"websocket-client","version":"0.53.0"},{"package":"xphyle","version":"4.2.2"},{"package":"pyyaml","version":"5.2"},{"package":"zipp","version":"2.2.0"}];
    await perf.performanceTest("pypi", payload47);
    setTimeout(() => {}, 2000);

    console.log("\n\n Comparision for 49 Dependencies: \n");
    let payload49 = [{"package":"aniso8601","version":"6.0.0"},{"package":"asn1crypto","version":"0.24.0"},{"package":"babel","version":"2.6.0"},{"package":"blinker","version":"1.4"},{"package":"certifi","version":"2019.3.9"},{"package":"cffi","version":"1.12.2"},{"package":"chardet","version":"3.0.4"},{"package":"click","version":"7.0"},{"package":"codecov","version":"2.0.15"},{"package":"colorama","version":"0.4.1"},{"package":"coverage","version":"4.5.3"},{"package":"flask-security","version":"3.0.0"},{"package":"flask-sqlalchemy","version":"2.3.2"},{"package":"flask-wtf","version":"0.14.2"},{"package":"flask","version":"0.11.1"},{"package":"gitdb2","version":"2.0.5"},{"package":"gitpython","version":"2.1.11"},{"package":"idna","version":"2.8"},{"package":"itsdangerous","version":"1.1.0"},{"package":"jinja2","version":"2.10.1"},{"package":"jsl","version":"0.2.4"},{"package":"lxml","version":"4.3.3"},{"package":"mando","version":"0.6.4"},{"package":"markupsafe","version":"1.1.1"},{"package":"mccabe","version":"0.6.1"},{"package":"mod-wsgi","version":"4.6.5"},{"package":"passlib","version":"1.7.0"},{"package":"py-lru-cache","version":"0.1.4"},{"package":"pycodestyle","version":"2.5.0"},{"package":"pycparser","version":"2.19"},{"package":"pydantic","version":"1.5.1"},{"package":"pyflakes","version":"2.1.1"},{"package":"pygithub","version":"1.43.6"},{"package":"pyjwt","version":"1.7.1"},{"package":"pytz","version":"2019.1"},{"package":"radon","version":"3.0.1"},{"package":"raven[flask]","version":"6.10.0"},{"package":"requests-futures","version":"0.9.9"},{"package":"requests","version":"2.21.0"},{"package":"semantic-version","version":"2.6.0"},{"package":"six","version":"1.12.0"},{"package":"smmap2","version":"2.0.5"},{"package":"speaklater","version":"1.3"},{"package":"sqlalchemy","version":"1.3.2"},{"package":"tenacity","version":"6.2.0"},{"package":"werkzeug","version":"0.15.2"},{"package":"wrapt","version":"1.11.1"},{"package":"wtforms","version":"2.2.1"},{"package":"urllib3","version":"1.24.1"}];
    await perf.performanceTest("pypi", payload49);
    setTimeout(() => {}, 2000);

    console.log("\n\n Comparision for 56 Dependencies: \n");
    let payload56 = [{"package":"amqp","version":"2.1.4"},{"package":"anymarkup-core","version":"0.7.1"},{"package":"anymarkup","version":"0.7.0"},{"package":"argh","version":"0.26.2"},{"package":"beautifulsoup4","version":"4.6.3"},{"package":"billiard","version":"3.5.0.4"},{"package":"boto3","version":"1.9.44"},{"package":"boto","version":"2.49.0"},{"package":"botocore","version":"1.12.44"},{"package":"celery","version":"4.2.1"},{"package":"certifi","version":"2018.10.15"},{"package":"chardet","version":"3.0.4"},{"package":"click","version":"7.0"},{"package":"codegen","version":"1.0"},{"package":"colorama","version":"0.3.9"},{"package":"configobj","version":"5.0.6"},{"package":"docutils","version":"0.14"},{"package":"flake8-polyfill","version":"1.0.2"},{"package":"flake8","version":"3.6.0"},{"package":"git2json","version":"0.2.3"},{"package":"graphviz","version":"0.10.1"},{"package":"gitpython","version":"2.1.11"},{"package":"idna","version":"2.7"},{"package":"jmespath","version":"0.9.3"},{"package":"jsl","version":"0.2.4"},{"package":"json5","version":"0.6.1"},{"package":"jsonschema","version":"2.6.0"},{"package":"kombu","version":"4.2.1"},{"package":"logutils","version":"0.3.5"},{"package":"lxml","version":"4.2.5"},{"package":"mando","version":"0.6.4"},{"package":"mccabe","version":"0.6.1"},{"package":"pathtools","version":"0.1.2"},{"package":"psycopg2","version":"2.7.6.1"},{"package":"pycodestyle","version":"2.4.0"},{"package":"pyflakes","version":"2.0.0"},{"package":"python-dateutil","version":"2.7.5"},{"package":"pytz","version":"2018.7"},{"package":"pyyaml","version":"3.13"},{"package":"radon","version":"3.0.1"},{"package":"rainbow-logging-handler","version":"2.2.2"},{"package":"raven","version":"6.9.0"},{"package":"requests","version":"2.20.1"},{"package":"requests-futures","version":"0.9.7"},{"package":"s3transfer","version":"0.1.13"},{"package":"selinon[celery]","version":"1.0.0"},{"package":"semantic-version","version":"2.6.0"},{"package":"six","version":"1.11.0"},{"package":"sqlalchemy","version":"1.2.14"},{"package":"toml","version":"0.9.4"},{"package":"unidiff","version":"0.5.5"},{"package":"urllib3","version":"1.24.1"},{"package":"vine","version":"1.1.4"},{"package":"watchdog","version":"0.9.0"},{"package":"werkzeug","version":"0.14.1"},{"package":"xmltodict","version":"0.11.0"}];
    await perf.performanceTest("pypi", payload56);
    setTimeout(() => {}, 2000);

    console.log("\n\n Comparision for 70 Dependencies: \n");
    let payload70 = [{"package":"pbr!","version":"2.1.0"},{"package":"SQLAlchemy","version":"1.2.19"},{"package":"decorator","version":"4.1.0"},{"package":"eventlet","version":"0.22.0"},{"package":"Jinja2","version":"2.10"},{"package":"keystonemiddleware","version":"4.20.0"},{"package":"lxml","version":"4.5.0"},{"package":"Routes","version":"2.3.1"},{"package":"cryptography","version":"2.7"},{"package":"WebOb","version":"1.8.2"},{"package":"greenlet","version":"0.4.15"},{"package":"PasteDeploy","version":"1.5.0"},{"package":"Paste","version":"2.0.2"},{"package":"PrettyTable","version":"0.8"},{"package":"sqlalchemy-migrate","version":"0.13.0"},{"package":"netaddr","version":"0.7.18"},{"package":"netifaces","version":"0.10.4"},{"package":"paramiko","version":"2.7.1"},{"package":"iso8601","version":"0.1.11"},{"package":"jsonschema","version":"3.2.0"},{"package":"python-cinderclient!","version":"4.0.0"},{"package":"keystoneauth1","version":"3.16.0"},{"package":"python-neutronclient","version":"6.7.0"},{"package":"python-glanceclient","version":"2.8.0"},{"package":"requests","version":"2.14.2"},{"package":"six","version":"1.11.0"},{"package":"stevedore","version":"1.20.0"},{"package":"websockify","version":"0.9.0"},{"package":"oslo.cache","version":"1.26.0"},{"package":"oslo.concurrency","version":"3.29.0"},{"package":"oslo.config","version":"6.1.0"},{"package":"oslo.context","version":"2.22.0"},{"package":"oslo.log","version":"3.36.0"},{"package":"oslo.reports","version":"1.18.0"},{"package":"oslo.serialization!","version":"2.19.1"},{"package":"oslo.upgradecheck","version":"0.1.1"},{"package":"oslo.utils","version":"4.1.0"},{"package":"oslo.db","version":"4.44.0"},{"package":"oslo.rootwrap","version":"5.8.0"},{"package":"oslo.messaging","version":"10.3.0"},{"package":"oslo.policy","version":"3.1.0"},{"package":"oslo.privsep","version":"1.33.2"},{"package":"oslo.i18n","version":"3.15.3"},{"package":"oslo.service","version":"1.40.1"},{"package":"rfc3986","version":"1.1.0"},{"package":"oslo.middleware","version":"3.31.0"},{"package":"psutil","version":"3.2.2"},{"package":"oslo.versionedobjects","version":"1.35.0"},{"package":"os-brick","version":"3.1.0"},{"package":"os-resource-classes","version":"0.4.0"},{"package":"os-traits","version":"2.4.0"},{"package":"os-vif","version":"1.14.0"},{"package":"os-win","version":"4.2.0"},{"package":"castellan","version":"0.16.0"},{"package":"microversion-parse","version":"0.2.1"},{"package":"os-xenapi","version":"0.3.4"},{"package":"tooz","version":"1.58.0"},{"package":"cursive","version":"0.2.1"},{"package":"pypowervm","version":"1.1.15"},{"package":"retrying","version":"1.3.3"},{"package":"os-service-types","version":"1.7.0"},{"package":"taskflow","version":"3.8.0"},{"package":"python-dateutil","version":"2.5.3"},{"package":"futurist","version":"1.8.0"},{"package":"openstacksdk","version":"0.35.0"},{"package":"PyYAML","version":"3.13"},{"package":"flask","version":"0.12"},{"package":"markdown2","version":"2.2.0"},{"package":"passlib","version":"1.7.1"},{"package":"urllib3","version":"1.25.9"}];
    await perf.performanceTest("pypi", payload70);
    setTimeout(() => {}, 2000);
        
}

runPerformance();
