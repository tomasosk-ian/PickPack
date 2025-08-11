"use client";
import ButtonCustomComponent from "~/components/buttonCustom";
import { setLang } from "../actions";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Languages } from "~/translations";
import { SidebarTrigger, useSidebar } from "~/components/ui/sidebar";

export default function Home({ lang }: { lang?: string }) {
  const t = useTranslations("HomePage");
  const { toggleSidebar } = useSidebar();

  return (
    <div>
      <div
        className="masthead inline-header center widgets large-mobile-menu-icon dt-parent-menu-clickable show-sub-menu-on-hover show-device-logo show-mobile-logo top-0"
        role="banner"
      >
        <header className="header-bar">
          <div className="branding">
            <div id="site-title" className="assistive-text">
              Pick Pack
            </div>
            <div id="site-description" className="assistive-text">
              Recibe tus paquetes donde quieras
            </div>
            <a className="" href="https://pickpack.com.ar/">
              <img
                className="preload-me"
                src="./Pick-Pack.png"
                width="207"
                height="74"
                sizes="207px"
                alt="Pick Pack"
              />
              <img
                className="mobile-logo preload-me"
                src="./Pick-Pack.png"
                width="183"
                height="64"
                sizes="183px"
                alt="Pick Pack"
              />
            </a>
          </div>

          <div className="mini-widgets">
            <div className="max-w-[140px] pl-4">
              <Select
                defaultValue={lang}
                onValueChange={(v) =>
                  setLang(v as Languages).catch(console.error)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("language")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>
        <div className="mobile-header-bar">
          <div className="mobile-navigation"></div>
          <div className="mobile-mini-widgets"></div>
          <div className="mobile-branding">
            <a className="" href="https://pickpack.com.ar/">
              <img
                className="preload-me"
                src="./Pick-Pack.png"
                width="207"
                height="74"
                sizes="207px"
                alt="Pick Pack"
              />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
