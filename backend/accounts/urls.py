from django.urls import path

from . import views

app_name = "accounts"

urlpatterns = [
    path("login/", views.LoginView.as_view(), name="login"),
    path("signup/", views.SignupView.as_view(), name="signup"),
    path("password/reset/", views.ResetPasswordView.as_view(), name="reset_password"),
    path("admin/users/", views.AdminUserListView.as_view(), name="admin_users_list"),
]
