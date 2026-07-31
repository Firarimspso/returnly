namespace Returnly.Api.Data;

public static class SeedData
{
    public static readonly Guid DemoRestaurantId = Guid.Parse("2d1b09d7-76ed-4af2-8ea1-3d2036837a01");
    public static readonly Guid DemoAdminUserId = Guid.Parse("1be0ace2-2161-41c6-8334-01829a4ab101");
    public static readonly Guid SecondDemoRestaurantId = Guid.Parse("8c0f7be8-6385-4b45-9161-d330092c7602");
    public static readonly Guid SecondDemoAdminUserId = Guid.Parse("67557f80-fd28-476d-99df-bd0cf87e52d5");
    public static readonly DateTimeOffset SeededAt = new(2026, 7, 24, 0, 0, 0, TimeSpan.Zero);
    public const string DemoAdminEmail = "admin@solemaple.com";
    public const string SecondDemoAdminEmail = "admin@cedarplate.com";
    public const string DemoAdminPasswordHash = "$2y$12$sSxHWN7yLGI1iFuDwG7Que3FL6OBQSuVtS1.J4Vkx37v.ETeSVYrC";
}
