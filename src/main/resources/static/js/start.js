$(function () {
    function microservices(serviceList) {
        this.serviceList = serviceList;
    }

    microservices.prototype.addService = function(microservice) {
        this.serviceList.push(microservice);
    }

    microservices.prototype.deleteServiceByName = function(serviceName) {
        this.serviceList = this.serviceList.filter(function(service) {
            return service.name != serviceName;
        });

        return this.serviceList;
    }

    function microservice(serviceName, moduleList, port) {
        this.name = serviceName;
        this.modules = moduleList;
        this.port = port;
    }

    microservice.prototype.getName = function() {
        return this.name;
    }

    microservice.prototype.getModuleList = function() {
        return this.modules;
    }

    microservice.prototype.getPort = function() {
        return this.port;
    }

    var allServiceList = new microservices([]);

    if (navigator.appVersion.indexOf("Mac") != -1) {
        $(".btn-primary").append("<kbd>&#8984; + &#9166;</kbd>");
    }
    else {
        $(".btn-primary").append("<kbd>alt + &#9166;</kbd>");
    }

    $("#type").on('change', function () {
        $("#form").attr('action', $(this.options[this.selectedIndex]).attr('data-action'))
    });

    // Switch between get started video tabs
    var generateTab = $("#generate-tab");
    var buildRunTab = $("#build-run-tab");
    var generateVideo = $("#generate-animation");
    var buildRunVideo = $("#build-run-animation");

    // Switch between configuration and default
    var configPort = $("#config-port");
    var infraPort = $(".port-input");

    // Configurable steps
    var metaDataConfig = $("#meta-data-config");
    var infraModulesSelector = $("#infra-selection");
    var azureModulesSelector = $("#azure-selection");
    var metaDataStep = $("#meta-data-step")[0];
    var infraStep = $("#infra-step")[0];
    var azureStep = $("#azure-step")[0];

    var selectedModules = $("#selected-modules-list");
    var createAzureServiceBtn = $("#create-azure-service");

    // Checkbox
    var infraCheckbox = $(".infra-checkbox");
    var azureCheckbox = $(".azure-checkbox");

    var azureServiceNameInput = $("#azure-service-name");
    var azureServicePortInput = $("#azure-service-port");

    var serviceNameHelp = $("#service-name-help");
    var servicePortHelp = $("#port-help");

    azureCheckbox.on("change", addServiceBtnChecker);
    azureServiceNameInput.on("input", addServiceBtnChecker);
    azureServicePortInput.on("input", addServiceBtnChecker);

    configPort.on("click", function () {
        if (infraPort.hasClass("hidden")) {
            infraPort.addClass("is-active");
            infraPort.removeClass("hidden");
            configPort.text("hide service configuration?")
        } else {
            infraPort.removeClass("is-active");
            infraPort.addClass("hidden");
            configPort.text("configure your services?")
        }
    });

    infraPort.on("blur", function() {
        updateInfraPort($(this));
    });

    generateTab.on("click", function() {
        generateTab.addClass("is-active");
        buildRunTab.removeClass("is-active");

        generateVideo.removeClass("hidden");
        buildRunVideo.addClass("hidden");

    });

    buildRunTab.on("click", function() {
        buildRunTab.addClass("is-active");
        generateTab.removeClass("is-active");

        generateVideo.addClass("hidden");
        buildRunVideo.removeClass("hidden");
    });

    $("#next-goto-infra-step").on("click", function() {
        showInfraModulesConfig();
    });

    $("#next-goto-azure-step").on("click", function() {
       showAzureModulesConfig();
    });

    $("#prev-goto-meta-step").on("click", function() {
        showMetaDataConfig();
    });

    $("#prev-goto-infra-step").on("click", function() {
       showInfraModulesConfig();
    });

    infraCheckbox.on("change", function() {
        updateInfraService($(this), true);
    });

    createAzureServiceBtn.on("click", function() {
        var serviceName = azureServiceNameInput.val().trim();
        var servicePort = azureServicePortInput.val().trim();

        var azureModuleCheckboxs = $("input[name='azure-modules']");
        var moduleList = [];
        azureModuleCheckboxs.each(function() {
            if($(this)[0].checked) {
                moduleList.push($(this).val());
            }
        })

        var azureMicroService = new microservice(serviceName, moduleList, servicePort);
        if(addServiceOnPage(azureMicroService, true)) {
            // Clear input values
            azureServiceNameInput.val("");
            azureServicePortInput.val("");
            azureModuleCheckboxs.each(function() {
                $(this).prop('checked', false);
            });
        }
    });

    $("#generate-project").on("click", function(event) {
       event.preventDefault();
    });


    $("#download-project").on("click", function(event) {
        generateInProgress();
        var data = getProjectData();
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            var a;
            if (xhttp.readyState === 4 && xhttp.status === 200) {
                var fileName = getAttachmentName(xhttp);

                if (window.navigator && window.navigator.msSaveOrOpenBlob) { // For IE
                    window.navigator.msSaveOrOpenBlob(xhttp.response, fileName);
                } else { // For non-IE
                    a = document.createElement('a');
                    a.href = window.URL.createObjectURL(xhttp.response);
                    a.download = fileName;
                    a.style.display = 'none';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                }

                generateSucceed();
            } else if (xhttp.readyState === 4 && xhttp.status !== 200) {
                generateFailed();
            }
        };

        xhttp.open("POST", '/project.zip');
        xhttp.setRequestHeader("Content-Type", "application/json; charset=utf-8");
        setCsrfHeader(xhttp);
        // Set responseType as blob for binary responses
        xhttp.responseType = 'blob';
        xhttp.send(JSON.stringify(data));

        event.preventDefault();
    });

    $("#push-to-github").on("click", function() {
        if (!hasLoggedIn()) {
            showGithubModal();
            event.preventDefault();
            return;
        }

        generateInProgress();
        var data = getProjectData();
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if (xhttp.readyState === 4 && xhttp.status === 200) {
                generateSucceed();
            } else {
                generateFailed();
            }
        };

        xhttp.open("POST", '/push-to-github');
        xhttp.setRequestHeader("Content-Type", "application/json; charset=utf-8");

        setCsrfHeader(xhttp);
        xhttp.send(JSON.stringify(data));
    });

    function setCsrfHeader(xhttp) {
        var csrfToken = $("input[name='_csrf']").val();
        var csrfTokenHeader = $("input[name='_csrf_header']").val();

        xhttp.setRequestHeader(csrfTokenHeader, csrfToken);
    };

    function getProjectData() {
        var groupId = $("#groupId").val();
        var artifactId = $("#artifactId").val();
        var projectName = $("#project-name").val();
        var description = $("#description").val();

        return {
            name: projectName,
            groupId: groupId,
            artifactId: artifactId,
            baseDir: artifactId,
            description: description,
            packageName: groupId + "." + artifactId,
            microServices: allServiceList.serviceList
        };
    }

    function isValidServiceName(serviceName) {
        return serviceName && /^([a-zA-Z0-9\-]*)$/.test(serviceName);
    }

    function isValidPort(port) {
        return port && !isNaN(port) && port > 0;
    }

    function getAttachmentName(xhttprequest) {
        var disposition = xhttprequest.getResponseHeader('content-disposition');
        var matches = /"([^"]*)"/.exec(disposition);
        return (matches != null && matches[1] ? matches[1] : 'demo.zip');
    }

    function showMetaDataConfig() {
        toggleElements([metaDataConfig], [infraModulesSelector, azureModulesSelector]);

        activateStep(metaDataStep);
        disActivateStep(infraStep);
        disActivateStep(azureStep);

        showCompleteForm();
    }

    function showInfraModulesConfig() {
        toggleElements([infraModulesSelector], [metaDataConfig, azureModulesSelector]);

        completeStep(metaDataStep);
        activateStep(infraStep);
        disActivateStep(azureStep);

        showCompleteForm();
    }

    function showAzureModulesConfig() {
        toggleElements([azureModulesSelector], [metaDataConfig, infraModulesSelector]);

        completeStep(metaDataStep);
        completeStep(infraStep);
        activateStep(azureStep);

        showCompleteForm();
    }

    function showCompleteForm() {
        $("#form div")[0].scrollIntoView(false);
    }

    function showElements(elements) {
        elements.forEach(function(element) {
            element.removeClass("hidden");
        })
    }

    function hideElements(elements) {
        elements.forEach(function(element) {
            element.addClass("hidden");
        })
    }

    function toggleElements(elementsToShow, elementsToHide) {
        showElements(elementsToShow);
        hideElements(elementsToHide);
    }

    function activateStep(stepElement) {
        stepElement.className = "step-item is-active";
    }

    function disActivateStep(stepElement) {
        stepElement.className = "step-item";
    }

    function completeStep(stepElement) {
        stepElement.className = "step-item is-completed is-success";
    }

    function addServiceOnPage(service, deletable) {
        if(!isValidServiceName(service.getName()) || !isValidPort(service.getPort())
            || typeof service.getModuleList() === 'undefined' || service.getModuleList().length === 0) {
            console.warn("Some service property is empty or format illegal, " + JSON.stringify(service));
            return false;
        }

        allServiceList.addService(service);
        // Append selected services into the list on the page
        selectedModules.append(serviceItemDom(service, deletable));
        createAzureServiceBtn.prop('disabled', true);

        if (deletable) {
            $("#" + service.getName() + " span").on("click", function () {
                deleteServiceOnPage(service.getName());
                $("input[value='" + service.getName() + "']").prop('checked', false);
            });
        }
        return true;
    }

    function deleteServiceOnPage(serviceName) {
        allServiceList.deleteServiceByName(serviceName);
        $("#selected-modules-list #" + serviceName).remove();
    }

    function serviceItemDom(service, deletable) {
        var serviceElement = '<li id=\"' + service.getName() + '\">';
        if (deletable) {
            serviceElement += '<span class="icon"><i class="fas fa-times"></i></span>';
        } else {
            serviceElement += '<span class="icon" title="Cannot delete"><i class="fas fa-info-circle"></i></span>'
        }

        return serviceElement + '<strong>' + service.getName() + '</strong>, module(s): '
            + service.getModuleList().toString() + ', port: ' + service.getPort() + '</li>';
    }

    function addServiceBtnChecker() {
        var azureModuleSelected = false;
        azureCheckbox.each(function() {
            azureModuleSelected = azureModuleSelected || $(this)[0].checked;
        });

        var serviceName = azureServiceNameInput.val().trim();
        var servicePort = azureServicePortInput.val().trim();

        checkAndShowHelpMsg('name', serviceName, isValidServiceName, serviceNameHelp);
        checkAndShowHelpMsg('port', servicePort, isValidPort, servicePortHelp);

        if(azureModuleSelected && serviceNameHelp.is(":hidden") && servicePortHelp.is(":hidden")) {
            createAzureServiceBtn.prop('disabled', false);
        } else {
            createAzureServiceBtn.prop('disabled', true);
        }
    }

    function checkAndShowHelpMsg(prop, value, checkRule, helpElement) {
        var matchedServices = allServiceList.serviceList.filter(function(service) {
            return service[prop] === value;
        });

        if(!$.isEmptyObject(matchedServices) || !checkRule(value)) {
            showElements([helpElement]);
        } else {
            hideElements([helpElement]);
        }
    }

    function updateInfraPort(portInput) {
        var infraCheckbox = portInput.prev("input");
        var serviceName = infraCheckbox.val();

        if (infraCheckbox[0].checked) {
            deleteServiceOnPage(serviceName);
            updateInfraService(infraCheckbox, false);
        }
    }

    function updateInfraService(infraCheckbox, serviceDeletable) {
        var serviceName = infraCheckbox.val();
        var moduleList = [serviceName];
        var port = infraCheckbox.next("input").val();

        var service = new microservice(serviceName, moduleList, port);
        if(infraCheckbox[0].checked) {
            addServiceOnPage(service, serviceDeletable);
        } else {
            deleteServiceOnPage(serviceName);
        }
    }

    var inProgressLabel = $("#in-progress");
    var generateSucceedLabel = $("#generate-succeed");
    var generateFailedLabel = $("#generate-failed");

    function generateInProgress() {
        toggleElements([inProgressLabel], [generateSucceedLabel, generateFailedLabel]);
    }

    function generateSucceed() {
        toggleElements([generateSucceedLabel], [inProgressLabel, generateFailedLabel]);
    }

    function generateFailed() {
        toggleElements([generateFailedLabel], [inProgressLabel, generateSucceedLabel]);
    }

    var githubModal = $("#github-login-modal");
    var githubModalClose = $("#github-login-modal .delete");

    function showGithubModal() {
        githubModal.addClass("is-active");
    }

    githubModalClose.on("click", function(event) {
       event.preventDefault();
       githubModal.removeClass("is-active");
    });

    // Initialize already selected infra services
    infraCheckbox.each(function(){
        updateInfraService($(this), false);
    });
});