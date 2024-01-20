#include "wifi.h"
#include "servo.h"
#include "utils.h"
#include "../env.h"
#include "esp_log.h"
#include "netdb.h"
#include "esp_tls.h"

extern const uint8_t server_root_cert_pem_start[] asm(CERT_START);
extern const uint8_t server_root_cert_pem_end[]   asm(CERT_END);

#define TAG "main"
#define RECONNECT_DELAY_MS 5000

int server_connect(esp_tls_t *tls) {
    int res;

    // initialize tls
    esp_tls_cfg_t tls_cfg = {
        .cacert_buf = (const unsigned char *) server_root_cert_pem_start,
        .cacert_bytes = server_root_cert_pem_end - server_root_cert_pem_start,
        .skip_common_name = CFG_SKIP_COMMON_NAME,
        /* .tls_version = ESP_TLS_VER_TLS_1_3, */
    };

    // connect to server
    ESP_LOGI(TAG, "Connecting to %s:%d", SERVER_HOSTNAME, SERVER_PORT);
    res = esp_tls_conn_new_sync(SERVER_HOSTNAME, strlen(SERVER_HOSTNAME), SERVER_PORT, &tls_cfg, tls);
    if (res < 0) {
        ESP_LOGE(TAG, "esp_tls_conn_new_sync failed: errno %d", errno);
        return -1;
    } else {
        ESP_LOGI(TAG, "Connected to %s:%d", SERVER_HOSTNAME, SERVER_PORT);
    }

    // send API key
    res = Esp_tls_conn_write(tls, API_KEY, strlen(API_KEY));
    if (res < 0) {
        return res;
    }
    ESP_LOGI(TAG, "Sent API key");
    return 0;
}

void app_main(void) {
    // connect to wifi
    initialize_wifi();
    xEventGroupWaitBits(s_wifi_event_group, WIFI_CONNECTED_BIT, pdFALSE, pdFALSE, portMAX_DELAY);

    // initialize servo
    /* initialize_servo(); */
    
    int res;
    while (true) {
        // initialize tls
        esp_tls_t *tls = esp_tls_init();
        NULL_CHECK(tls);

        // connect to server
        res = server_connect(tls);
        if (res < 0) {
            esp_tls_conn_destroy(tls);
            // wait before attempting reconnect
            vTaskDelay(RECONNECT_DELAY_MS / portTICK_PERIOD_MS);
            continue;
        }

        // receive toggle requests from server
        int angle = 0;
        while (true) {
            char buf[1];
            int bytes_read = Esp_tls_conn_read(tls, buf, 1);
            if (bytes_read < 0) {
                esp_tls_conn_destroy(tls);
                break;
            }
            if (bytes_read > 0) {
                angle = (angle + 180) % 360;
                ESP_LOGI(TAG, "Received toggle request: rotating servo to %d degrees", angle);
                /* rotate_servo(angle); */
            }
        }
    }
}
