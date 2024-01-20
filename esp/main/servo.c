#include "driver/ledc.h"

#define SERVO_GPIO_PIN 9
#define LEDC_MODE LEDC_LOW_SPEED_MODE
#define LEDC_RESOLUTION LEDC_TIMER_16_BIT
#define LEDC_TIMER LEDC_TIMER_0
#define LEDC_CHANNEL LEDC_CHANNEL_0

void initialize_servo() {
    // Prepare and then apply the LEDC PWM timer configuration
    ledc_timer_config_t ledc_timer = {
        .speed_mode = LEDC_MODE,
        .duty_resolution = LEDC_RESOLUTION,
        .timer_num = LEDC_TIMER,
        .freq_hz = 50, // Servo motors typically use a frequency of 50 Hz
        .clk_cfg = LEDC_AUTO_CLK,
    };
    ESP_ERROR_CHECK(ledc_timer_config(&ledc_timer));

    // Prepare and then apply the LEDC PWM channel configuration
    ledc_channel_config_t ledc_channel = {
        .speed_mode = LEDC_MODE,
        .channel    = LEDC_CHANNEL,
        .timer_sel  = LEDC_TIMER,
        .intr_type  = LEDC_INTR_DISABLE,
        .gpio_num   = SERVO_GPIO_PIN,
        .duty       = 0, // Set duty to 0%
        .hpoint     = 0,
    };
    ESP_ERROR_CHECK(ledc_channel_config(&ledc_channel));
}

void rotate_servo(int degrees) {
    int duty_cycle = (degrees * (1 << LEDC_RESOLUTION) / 360);
    ledc_set_duty(LEDC_MODE, LEDC_CHANNEL, duty_cycle);
    ledc_update_duty(LEDC_MODE, LEDC_CHANNEL);
}
