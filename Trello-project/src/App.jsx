import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes";
import Layout from "./components/layout/Layout";
import useBoardStore from "./store/boardStore";
import useUiStore from "./store/uiStore";
import "./App.css";

// === ThemeInit ===
// Áp dụng data-theme + .dark class lên <html> mỗi khi theme thay đổi.
// - data-theme: dùng cho CSS selector `[data-theme="dark"]` (custom variables)
// - .dark: dùng cho shadcn/ui (Tailwind dark mode variant)
function ThemeInit() {
  const theme = useUiStore((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);
  return null;
}

// === AppInit ===
// Component không render gì cả (trả về null). Chỉ dùng để gọi `fetchBoards` một lần
// khi component mount, nhằm nạp dữ liệu board/list/card đã persist từ localStorage
// trước khi người dùng tương tác với ứng dụng.
function AppInit() {
  const fetchBoards = useBoardStore((s) => s.fetchBoards);
  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  return null;
}

// === Root App ===
// App là component gốc, chịu trách nhiệm thiết lập:
// 1. `BrowserRouter` – cung cấp routing cho toàn ứng dụng (SPA).
// 2. `ThemeInit`  – áp dụng theme (dark/light) lên <html>
// 3. `AppInit`    – nạp lại dữ liệu Trello đã lưu (boards, lists, cards).
// 4. `Layout`     – bố cục chính: Header, Sidebar (nếu auth), Main content.
// 5. `AppRoutes`  – định tuyến đến các feature pages (Dashboard, Board, Auth).
export default function App() {
  //   const wrapper = useCallback(async () => {
  //     const postPromise = new Promise((resolve, reject) => {
  //       setTimeout(() => {
  //         resolve({ id: 1, title: "Post 1", userId: 1 });
  //       }, 5000);
  //     });
  //     const userPromise = new Promise((resolve, reject) => {
  //       setTimeout(() => {
  //         resolve({ id: 1, name: "User 1", addressId: "01" });
  //       }, 10000);
  //     });
  //     const addressPromise = new Promise((resolve, reject) => {
  //       setTimeout(() => {
  //         resolve({ id: "01", street: "123 Main St", city: "Hanoi" });
  //       }, 15000);
  //     });

  //     console.time("fetching");
  //     const post = await postPromise;
  //     const user = await userPromise;
  //     const address = await addressPromise;
  //     // const results = await Promise.all([
  //     //   postPromise,
  //     //   userPromise,
  //     //   addressPromise,
  //     // ]);
  //     // const [post, user, address] = results;
  //     console.timeEnd("fetching");

  //     // console.timeEnd("fetching");

  //     console.log({
  //       post,
  //       user,
  //       address,
  //     });

  //     const a = (post, user) => {
  //       return `message: ${post.title} - ${user.name}`;
  //     };

  //     console.log(a(post, user));

  //     //  const {} = await post
  //     //     .then((post) => {
  //     //       console.log("Post:", post);

  //     //       return user.then((user) => {
  //     //         console.log("User:", user);

  //     //         return address.then((address) => {
  //     //           console.log("Address:", address);

  //     //           return {
  //     //             post,
  //     //             user,
  //     //             address,
  //     //           };
  //     //         });
  //     //       });
  //     //     }).then((result) => {
  //     //       console.log("Result:", result);
  //     //     })
  //     //     .catch((error) => {
  //     //       console.error("Error fetching post:", error);
  //     //     });

  //     // try {
  //     //   console.log(a);
  //     //   const b = await a;
  //     //   console.log(a);
  //     //   console.log(b);
  //     // } catch (error) {
  //     //   console.log(a);

  //     //   console.log(error);
  //     // }
  //   }, []);

  //   useEffect(() => {
  //     wrapper();
  //   }, [wrapper]);

  return (
    <BrowserRouter>
      <ThemeInit />
      <AppInit />
      <Layout>
        <AppRoutes />
      </Layout>
    </BrowserRouter>
  );
}
